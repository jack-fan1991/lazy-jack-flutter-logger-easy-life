
### Feature 
* Support flutter logger navigator to line position in debug console 
    * Convert the package path to absolute path and then you cant tap and fast to debug the code 
* dependency on flutter package
    - more feature => [color_logging](https://pub.dev/packages/color_logging)
    - more feature => [color_observer_logger](https://pub.dev/packages/color_observer_logger)

#### color_logging
* without extension
![](./image/logger/color_looger_bad1.png)
* with extension you can tap absolute path to code line
![](./image/logger/color_looger_good1.png)



#### color_observer_logger
* without extension
![](./image/logger/obs_logger_bad.png)
* with extension you can tap absolute path to code line
![](./image/logger/obs_logger_good.png)


### ✅ Relative Path Modes

Control how file paths appear in logs:
- `'session'` — Only session project uses relative paths
- `'workspace'` — All workspace folders use relative paths
- `'always'` — All paths converted to relative
- `'never'` — Always show absolute paths

---
## ⚙️ Settings

Customize how file paths and emojis are displayed in logs via `settings.json`.

---

### 🔧 Emoji Map (`FlutterLoggerEasyLife.emojiMap`)

Defines the emoji prefix for different file source types:

| Key       | Description                                          | Default Emoji |
|-----------|------------------------------------------------------|----------------|
| `session` | Files from the currently active project              | 🎯             |
| `sdk`     | Files from the Flutter SDK                           | 🔧             |
| `pub`     | Packages from [pub.dev](https://pub.dev)             | 📦             |
| `local`   | Locally defined path packages (e.g., `../mypkg`)     | 🧩             |

You can override these in your VSCode settings.

---

### 🔧 Example Configuration

```json
// settings.json
{
  "FlutterLoggerEasyLife.relativePathMode": "workspace",
  "FlutterLoggerEasyLife.showEmoji": true,
  "FlutterLoggerEasyLife.silent": false,
  "FlutterLoggerEasyLife.emojiMap": {
    "session": "🎯",
    "sdk": "🔧",
    "pub": "📦",
    "local": "🧩"
  }
}
```