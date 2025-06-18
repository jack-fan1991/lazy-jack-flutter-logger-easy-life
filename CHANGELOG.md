### 0.0.16
- **Relative Path Modes**:  
  Added `relativePathMode` setting with four options:  
  - `session`: Relative path only for the current session project  
  - `workspace`: Relative path for all workspace folders  
  - `always`: Convert all paths to relative  
  - `never`: Always display absolute paths  

- **Emoji Prefix**:  
  Introduced `showEmoji` and `emojiMap` settings to customize emojis for log paths  
  - Default: 🎯 (session), 📦 (pub packages)  

- **Custom Emoji Mapping**:  
  Users can now define their own emojis for different path types using `emojiMap`  

- **Support local package**: 
    - support hot reload in local package

# 0.0.15
- Silenced unnecessary warnings

# 0.0.14
- Improved extension performance by reducing redundant path resolution.
- Optimized file scanning logic for better runtime efficiency.

# 0.0.13
### 🛠 Breaking Changes
- Removed the setting `"FlutterLoggerEasyLife.customPrefix"` from `settings.json`.

### ✨ New Features
- Added automatic detection of the working directory during debug sessions.
- No need to manually configure `"customPrefix"` anymore.


# 0.0.10
- Feature Support run subfolder project as Example/
- See More: https://github.com/jack-fan1991/lazy-jack-flutter-logger-easy-life/blob/master/README.md

# 0.0.9
- Feature Multi-level Workspace Support
- See More: https://github.com/jack-fan1991/lazy-jack-flutter-logger-easy-life/blob/master/README.md

# 0.0.8
- Replaced `..//` with `../` in debug output path rewriting to ensure correct and cross-platform file paths.

# 0.0.7
- fix bug in release mode

# 0.0.6
- Support ios

# 0.0.4
- Initial