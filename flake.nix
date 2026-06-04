{
  description = "Terminal Slide Show — non-GUI slideshow with Google Drive sync";

  inputs = {
    nixpkgs.url = "github:NixOS/nixpkgs/nixos-unstable";
    flake-utils.url = "github:numtide/flake-utils";
  };

  outputs = { self, nixpkgs, flake-utils }:
    flake-utils.lib.eachDefaultSystem (system:
      let
        pkgs = nixpkgs.legacyPackages.${system};
      in
      {
        devShells.default = pkgs.mkShell {
          name = "terminal-slide-show";

          packages = with pkgs; [
            nodejs_24
            python3
            gnumake
            gcc
          ];

          shellHook = ''
            if [ ! -d node_modules ]; then npm install; fi
            if [ ! -d client/node_modules ]; then npm install --prefix client; fi
            if [ ! -d server/node_modules ]; then npm install --prefix server; fi
            echo "Terminal Slide Show dev shell"
            echo "  npm run dev:frontend  — start Vite dev server"
            echo "  npm run dev:backend   — start Node.js backend"
            echo "  npm run dev           — start both concurrently"
          '';
        };
      }
    );
}
