declare module "*.module.css" {
  // biome-ignore lint/suspicious/noExplicitAny: to use dot notation
  const classes: any;
  export default classes;
}

declare module "*.module.scss" {
  // biome-ignore lint/suspicious/noExplicitAny: to use dot notation
  const classes: any;
  export default classes;
}
