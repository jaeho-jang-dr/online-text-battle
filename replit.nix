{ pkgs }: {
  deps = [
    pkgs.nodejs-20_x
    pkgs.nodePackages.typescript
    pkgs.nodePackages.typescript-language-server
  ];
  
  env = {
    NODE_ENV = "production";
  };
}