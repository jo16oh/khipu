extern crate proc_macro;

mod eyre_to_any;
mod log_err;

use proc_macro::TokenStream;

#[proc_macro_attribute]
pub fn log_err(_attr: TokenStream, item: TokenStream) -> TokenStream {
    log_err::log_err_impl(item)
}

#[proc_macro_attribute]
pub fn eyre_to_any(_attr: TokenStream, item: TokenStream) -> TokenStream {
    eyre_to_any::eyre_to_any_impl(item)
}
