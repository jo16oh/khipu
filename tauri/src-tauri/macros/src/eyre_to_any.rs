use proc_macro::TokenStream;
use quote::quote;
use syn::{GenericArgument, ItemFn, PathArguments, ReturnType, Type, parse_macro_input};

pub fn eyre_to_any_impl(item: TokenStream) -> TokenStream {
    let input = parse_macro_input!(item as ItemFn);

    // 関数のシグネチャを取得
    let sig = &input.sig;
    let asyncness = &sig.asyncness;
    let name = &sig.ident;
    let generics = &sig.generics;
    let inputs = &sig.inputs;
    let output = &sig.output;

    let attrs = &input.attrs;
    let visibility = &input.vis;
    let block = &input.block;

    // 戻り値の型がeyre::Resultであることをチェック
    if let ReturnType::Type(_, ty) = output {
        if let Type::Path(type_path) = &**ty {
            let segments = &type_path.path.segments;
            if segments.len() == 2 && segments[0].ident == "eyre" && segments[1].ident == "Result" {
                // 元の関数の戻り値の型を取得
                let inner_ty =
                    if let PathArguments::AngleBracketed(ref args) = segments[1].arguments {
                        if let Some(GenericArgument::Type(inner_ty)) = args.args.first() {
                            inner_ty
                        } else {
                            return syn::Error::new_spanned(
                                output,
                                "Expected a type argument for Result",
                            )
                            .to_compile_error()
                            .into();
                        }
                    } else {
                        return syn::Error::new_spanned(
                            output,
                            "Expected angle bracketed arguments for Result",
                        )
                        .to_compile_error()
                        .into();
                    };

                // 新しい戻り値の型をResult<T, KhipuError::AnyError>に変更
                let new_output =
                    quote! { -> std::result::Result<#inner_ty, crate::error::KhipuError> };

                // 条件を満たしている場合は元の関数をラップして新しい関数を生成
                let r#gen = match asyncness {
                    Some(_) => quote! {
                        #(#attrs)*
                        #visibility async fn #name #generics(#inputs) #new_output {
                            async { #block }.await.map_err(crate::error::KhipuError::from)
                        }
                    },
                    None => quote! {
                        #(#attrs)*
                        #visibility fn #name #generics(#inputs) #new_output {
                            {#block}.map_err(crate::error::KhipuError::from)
                        }
                    },
                };

                return r#gen.into();
            }
        }
    }

    // 条件を満たしていない場合はエラーを返す
    syn::Error::new_spanned(output, "Return type must be eyre::Result<T>")
        .to_compile_error()
        .into()
}
