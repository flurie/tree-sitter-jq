{
  inputs.nixpkgs.url = "github:NixOS/nixpkgs/nixpkgs-unstable";
  inputs.utils.url = "github:numtide/flake-utils";

  outputs = { self, utils, nixpkgs }:
    utils.lib.eachDefaultSystem (system:
      let pkgs = nixpkgs.legacyPackages.${system}; in
      {
        devShell = with pkgs; mkShell {
          buildInputs = [
            nodePackages.npm
            nodePackages.vscode-json-languageserver
            tree-sitter
            deno
          ];
        };
      }
    );
}
