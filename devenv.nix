{
  pkgs,
  lib,
  config,
  inputs,
  ...
}:

{
  # https://devenv.sh/basics/
  env.GREET = "devenv";

  # https://devenv.sh/packages/
  packages = with pkgs; [
    qt6.qtbase
    qt6.qtdeclarative
    qt6.qtwayland
    libGL
    fontconfig
    xorg.libX11
    glib
    libxkbcommon
    freetype
    zstd
    krb5
    xorg.xcbutilcursor
  ];

  # https://devenv.sh/languages/
  languages.python = {
    enable = true;
    venv.enable = true;
    venv.requirements = ''
      PySide6
    '';
  };

  # https://devenv.sh/processes/
  # processes.cargo-watch.exec = "cargo-watch";

  # https://devenv.sh/services/
  # services.postgres.enable = true;

  # https://devenv.sh/scripts/
  scripts.hello.exec = ''
    echo hello from $GREET
  '';

  enterShell =
    let
      makeQtpluginPath = pkgs.lib.makeSearchPathOutput "out" pkgs.qt6.qtbase.qtPluginPrefix;
      makeQmlpluginPath = pkgs.lib.makeSearchPathOutput "out" pkgs.qt6.qtbase.qtQmlPrefix;
    in
    ''
      hello
      git --version
      export QT_PLUGIN_PATH=${
        makeQtpluginPath (
          with pkgs.qt6;
          [
            qtbase
            qtdeclarative
            qtsvg
          ]
        )
      }
      export QML2_IMPORT_PATH=${makeQmlpluginPath (with pkgs; with qt6; [ qtdeclarative ])}
      export QML_IMPORT_PATH=$QML2_IMPORT_PATH
    '';

  # https://devenv.sh/tasks/
  # tasks = {
  #   "myproj:setup".exec = "mytool build";
  #   "devenv:enterShell".after = [ "myproj:setup" ];
  # };

  # https://devenv.sh/tests/
  enterTest = ''
    echo "Running tests"
    git --version | grep --color=auto "${pkgs.git.version}"
  '';

  # https://devenv.sh/git-hooks/
  # git-hooks.hooks.shellcheck.enable = true;

  # See full reference at https://devenv.sh/reference/options/
}
