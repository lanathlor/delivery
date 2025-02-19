{ pkgs ? import <nixpkgs> { } }:
pkgs.mkShell {
  buildInputs = with pkgs; with nodePackages; [
    nodejs_20
    pnpm
  ];
}
