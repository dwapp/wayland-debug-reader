# This Python file uses the following encoding: utf-8
import sys
from pathlib import Path

from PySide6.QtGui import QGuiApplication
from PySide6.QtQml import QQmlApplicationEngine
from PySide6.QtCore import QCoreApplication, QFile, QIODevice

if __name__ == "__main__":
    app = QGuiApplication(sys.argv)
    QCoreApplication.setApplicationName("Wayland Log Reader")

    # 解析命令行参数
    wayland_log = ""
    if len(sys.argv) < 2:
        print("Reading log from stdin")
        wayland_log = sys.stdin.read()  # 直接读取 stdin 的内容
    elif len(sys.argv) == 2:
        try:
            with open(sys.argv[1], "r", encoding="utf-8") as file:
                wayland_log = file.read()
        except FileNotFoundError:
            print("Failed to open log file", file=sys.stderr)
            sys.exit(-1)

    # 加载QML引擎
    engine = QQmlApplicationEngine()
    engine.rootContext().setContextProperty("waylandLog", wayland_log)
    qml_file = Path(__file__).resolve().parent / "Main.qml"
    engine.load(qml_file)

    if not engine.rootObjects():
        sys.exit(-1)
    sys.exit(app.exec())
