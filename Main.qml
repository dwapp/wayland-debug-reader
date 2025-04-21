import QtQuick
import QtQuick.Controls
import QtQuick.Window
import "./wayland-debug-tools.js" as WaylandDebugTools

ApplicationWindow {
    id: window
    visible: true
    title: "wayland-log-reader"
    width: 800
    height: 600
    background: Rectangle { color: "#F5F5DC" }
    property int highlightObject: 0
    property string log: waylandLog

    function handleObjectSelected(object) {
        highlightObject = object.uniqueId;
    }

    // 使用 SplitView 替代手动分隔条
    SplitView {
        anchors.fill: parent
        orientation: Qt.Horizontal

        // 左侧内容
        Item {
                       id: rightPane
            SplitView.preferredWidth: 500 // 默认宽度
            ScrollView {
                anchors.fill: parent
                clip: true
                Column {
                    width: rightPane.width
                    CheckBox {
                        id: showComments
                        text: "Show comments"
                        checked: true
                    }
                    Repeater {
                        model: parsedLines
                        Item {
                            id: lineItem
                            property var line: parsedLines[index]
                            width: parent.width
                            implicitWidth: childrenRect.width
                            implicitHeight: childrenRect.height
                            Repeater {
                                model: type === "comment" && showComments.checked
                                Label {
                                    height: 25
                                    text: rawText; color: "gray"
                                }
                            }
                            Repeater {
                                model: type === "event"
                                Row {
                                    height: 25
                                    spacing: 5
                                    ObjectLabel { object: parts.object; onClicked: handleObjectSelected(object) }
                                    Label { text: parts.fn }
                                    Label { text: "(" }
                                    Repeater {
                                        model: parts.args
                                        ArgumentItem {
                                            arg: parts.args[index];
                                            function onObjectSelected(object) {
                                                handleObjectSelected(object)
                                            }
                                        }
                                    }
                                    Label { text: ")" }
                                }
                            }
                            Repeater {
                                model: type === "request"
                                Row {
                                    height: 25
                                    spacing: 5
                                    Label { text: " → " }
                                    ObjectLabel { object: parts.object; onClicked: window.highlightObject = object.uniqueId }
                                    Label { text: parts.fn }
                                    Label { text: "(" }
                                    Repeater {
                                        model: parts.args
                                        ArgumentItem {
                                            arg: parts.args[index];
                                            function onObjectSelected(object) {
                                                handleObjectSelected(object)
                                            }
                                        }
                                    }
                                    Label { text: ")" }
                                }
                            }
                        }
                    }
                }
            }
        }


        // 右侧内容
        Item {
             id: leftPane
            SplitView.preferredWidth: 300 // 默认宽度
            ScrollView {
                anchors.fill: parent
                Column {
                    spacing: 3
                    width: leftPane.width
                    Label { text: "All objects"; font.weight: Font.Bold; font.pixelSize: 16 }
                    Repeater {
                        model: objects
                        ObjectLabel { object: objects.get(index); onClicked: handleObjectSelected(object) }
                    }
                    Item { height: 5; width: 1 }
                    Label { text: "Globals"; font.weight: Font.Bold; font.pixelSize: 16 }
                    Repeater {
                        model: globals
                        Label { text: number + ": " + interfaceName + " v" + version }
                    }
                }
            }
        }
    }

    property var state: ({})
    ListModel { id: parsedLines }
    ListModel { id: objects }
    ListModel { id: globals }

    function hash(str) {
        var hash = 0;
        if (this.length === 0)
            return hash;
        for (var i = 0; i < str.length; ++i) {
            const chr = str.charCodeAt(i);
            hash = ((hash << 5) - hash) + chr;
            hash |= 0; // Convert to 32bit integer
        }
        return hash;
    }

    function colorHash(value) {
        const hue = 0.5 + hash(Qt.md5(value)) / Math.pow(2, 32);
        return Qt.hsla(hue, 1, 0.4, 1);
    }

    Component.onCompleted: {
        state = WaylandDebugTools.parseLog(waylandLog);

        // add the lines to a model Qt understands
        state.parsedLines.forEach(function(line) {
            parsedLines.append(line);
        });

        // and the objets
        for (let k in state.objects) {
            objects.append(state.objects[k]);
        }

        // and the globals
        for (let k in state.globals) {
            globals.append(state.globals[k])
        }
    }
}
