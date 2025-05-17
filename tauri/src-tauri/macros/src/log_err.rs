use proc_macro::TokenStream;
use quote::quote;
use syn::{ItemFn, parse_macro_input};

pub fn log_err_impl(item: TokenStream) -> TokenStream {
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

    let r#gen = match asyncness {
        Some(_) => quote! {
            #(#attrs)*
            #visibility async fn #name #generics(#inputs) #output {
                async { #block }.await.inspect_err(|e| eprintln!("{}", e))
            }
        },
        None => quote! {
            #(#attrs)*
            #visibility fn #name #generics(#inputs) #output {
                {#block}.inspect_err(|e| eprintln!("{}", e))
            }
        },
    };

    r#gen.into()
}
