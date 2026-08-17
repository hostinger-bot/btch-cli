#!/usr/bin/env bash
set -euo pipefail

APP="btch"
REPO="hostinger-bot/btch-cli"
RELEASES_API="https://api.github.com/repos/${REPO}/releases"
USER_DIR="${HOME}/.btch"
INSTALL_DIR="${USER_DIR}/bin"
METADATA_PATH="${USER_DIR}/install.json"
PATH_MARKER="# btch"

requested_version=""
binary_path=""
no_modify_path=false
written_config_file=""
written_path_command=""

usage() {
  cat <<'EOF'
Install btch from GitHub Releases.

Usage:
  curl -fsSL https://raw.githubusercontent.com/hostinger-bot/btch-cli/main/install.sh | bash
  curl -fsSL https://raw.githubusercontent.com/hostinger-bot/btch-cli/main/install.sh | bash -s -- --version 1.0.2
  bash install.sh --binary /path/to/btch

Options:
  -v, --version <version>  Install a specific version
  -b, --binary <path>      Install from a local binary instead of downloading
      --no-modify-path     Do not edit shell config files
  -h, --help               Show this help text
EOF
}

while [[ $# -gt 0 ]]; do
  case "$1" in
    -h|--help)
      usage
      exit 0
      ;;
    -v|--version)
      if [[ -z "${2:-}" ]]; then
        echo "Error: --version requires a version argument" >&2
        exit 1
      fi
      requested_version="$2"
      shift 2
      ;;
    -b|--binary)
      if [[ -z "${2:-}" ]]; then
        echo "Error: --binary requires a path argument" >&2
        exit 1
      fi
      binary_path="$2"
      shift 2
      ;;
    --no-modify-path)
      no_modify_path=true
      shift
      ;;
    *)
      echo "Warning: Unknown option '$1'" >&2
      shift
      ;;
  esac
done

mkdir -p "$INSTALL_DIR"
chmod 700 "$USER_DIR" "$INSTALL_DIR"

resolve_target() {
  local raw_os arch
  raw_os=$(uname -s)
  case "$raw_os" in
    Darwin*) OS="darwin" ;;
    Linux*)  OS="linux" ;;
    MINGW*|MSYS*|CYGWIN*) OS="windows" ;;
    *)
      echo "Unsupported OS: ${raw_os}" >&2
      exit 1
      ;;
  esac

  arch=$(uname -m)
  case "$arch" in
    arm64|aarch64) ARCH="arm64" ;;
    x86_64|amd64)  ARCH="x64" ;;
    *)
      echo "Unsupported architecture: ${arch}" >&2
      exit 1
      ;;
  esac

  case "${OS}-${ARCH}" in
    darwin-arm64|linux-x64|windows-x64) ;;
    *)
      echo "Unsupported platform: ${OS}-${ARCH}" >&2
      exit 1
      ;;
  esac

  TARGET="${OS}-${ARCH}"

  # Older x64 CPUs (pre-AVX2, e.g. Sandy Bridge) crash with SIGILL on the
  # regular build, so pick the baseline variant automatically. Modern CPUs
  # get the faster regular build.
  BASELINE_SUFFIX=""
  if [[ "$TARGET" == "linux-x64" ]] && ! cpu_supports_avx2; then
    BASELINE_SUFFIX="-baseline"
  fi

  if [[ "$TARGET" == windows-* ]]; then
    ASSET_NAME="btch-${TARGET}${BASELINE_SUFFIX}.exe"
    BINARY_NAME="btch.exe"
  else
    ASSET_NAME="btch-${TARGET}${BASELINE_SUFFIX}"
    BINARY_NAME="btch"
  fi
}

cpu_supports_avx2() {
  if [[ -r /proc/cpuinfo ]] && grep -q '\bavx2\b' /proc/cpuinfo; then
    return 0
  fi
  if command -v sysctl >/dev/null 2>&1; then
    # macOS/BSD fallback; btch only ships a baseline for linux-x64, so this
    # is only consulted on non-Linux platforms where it returns 0 anyway.
    sysctl -a 2>/dev/null | grep -qi 'avx2' && return 0
  fi
  return 1
}

json_escape() {
  printf '%s' "$1" | sed 's/\\/\\\\/g; s/"/\\"/g'
}

json_or_null() {
  if [[ -n "${1:-}" ]]; then
    printf '"%s"' "$(json_escape "$1")"
  else
    printf 'null'
  fi
}

write_metadata() {
  local version="$1"
  cat > "$METADATA_PATH" <<METAEOF
{
  "schemaVersion": 1,
  "installMethod": "script",
  "version": "$(json_escape "$version")",
  "repo": "$(json_escape "$REPO")",
  "binaryPath": "$(json_escape "${INSTALL_DIR}/${BINARY_NAME}")",
  "installDir": "$(json_escape "$INSTALL_DIR")",
  "assetName": "$(json_escape "$ASSET_NAME")",
  "target": "$(json_escape "$TARGET")",
  "installedAt": "$(date -u +"%Y-%m-%dT%H:%M:%SZ")",
  "shellConfigPath": $(json_or_null "$written_config_file"),
  "pathCommand": $(json_or_null "$written_path_command"),
  "globalBinPath": $(json_or_null "$GLOBAL_BIN_PATH")
}
METAEOF
  chmod 600 "$METADATA_PATH"
}

setup_global_symlink() {
  # Create a symlink in a system bin dir that is already on PATH (e.g.
  # /usr/local/bin) so `btch` works immediately in the current session
  # without needing to source shell config. Only done when possible; the
  # script falls back to the PATH hint otherwise.
  GLOBAL_BIN_PATH=""
  [[ "$TARGET" == windows-* ]] && return 0
  [[ -w /usr/local/bin ]] || return 0
  if [[ -e "/usr/local/bin/${BINARY_NAME}" ]] && [[ ! -L "/usr/local/bin/${BINARY_NAME}" ]]; then
    # A real file (not our symlink) already exists; don't clobber it.
    return 0
  fi
  if ln -sf "${INSTALL_DIR}/${BINARY_NAME}" "/usr/local/bin/${BINARY_NAME}" 2>/dev/null; then
    GLOBAL_BIN_PATH="/usr/local/bin/${BINARY_NAME}"
  fi
}

sha256_file() {
  if command -v sha256sum >/dev/null 2>&1; then
    sha256sum "$1" | awk '{ print $1 }'
    return
  fi
  if command -v shasum >/dev/null 2>&1; then
    shasum -a 256 "$1" | awk '{ print $1 }'
    return
  fi
  if command -v openssl >/dev/null 2>&1; then
    openssl dgst -sha256 "$1" | awk '{ print $NF }'
    return
  fi
  echo "No SHA-256 tool found (expected sha256sum, shasum, or openssl)." >&2
  exit 1
}

verify_checksum() {
  local binary_file="$1" checksum_file="$2"
  local expected actual
  expected=$(awk -v asset="$ASSET_NAME" '$2 == asset || $2 == "*"asset { print $1 }' "$checksum_file")
  if [[ -z "$expected" ]]; then
    echo "Missing checksum for ${ASSET_NAME}" >&2
    exit 1
  fi
  actual=$(sha256_file "$binary_file")
  if [[ "$actual" != "$expected" ]]; then
    echo "Checksum mismatch for ${ASSET_NAME}" >&2
    exit 1
  fi
}

add_to_path() {
  local config_file="$1" command="$2"
  if grep -Fxq "$command" "$config_file" 2>/dev/null; then
    written_config_file="$config_file"
    written_path_command="$command"
    return
  fi
  printf '\n%s\n%s\n' "$PATH_MARKER" "$command" >> "$config_file"
  written_config_file="$config_file"
  written_path_command="$command"
}

maybe_update_path() {
  if [[ "$no_modify_path" == true ]]; then return; fi
  if [[ ":$PATH:" == *":$INSTALL_DIR:"* ]]; then return; fi

  local current_shell config_files config_file path_command
  local xdg_config_home="${XDG_CONFIG_HOME:-$HOME/.config}"
  current_shell=$(basename "${SHELL:-bash}")

  case "$current_shell" in
    fish)
      config_files="$xdg_config_home/fish/config.fish"
      path_command="fish_add_path $INSTALL_DIR"
      ;;
    zsh)
      config_files="${ZDOTDIR:-$HOME}/.zshrc ${ZDOTDIR:-$HOME}/.zshenv"
      path_command="export PATH=$INSTALL_DIR:\$PATH"
      ;;
    *)
      config_files="$HOME/.bashrc $HOME/.bash_profile $HOME/.profile"
      path_command="export PATH=$INSTALL_DIR:\$PATH"
      ;;
  esac

  config_file=""
  for file in $config_files; do
    if [[ -f "$file" ]]; then
      config_file="$file"
      break
    fi
  done

  if [[ -z "$config_file" ]]; then
    echo "Add this to your shell config manually:" >&2
    echo "  export PATH=$INSTALL_DIR:\$PATH" >&2
    return
  fi

  add_to_path "$config_file" "$path_command"
}

warn_if_prerelease() {
  local version="$1"
  case "$version" in
    *-rc*|*-alpha*|*-beta*|*-pre*)
      cat >&2 <<EOF

Warning: Installing pre-release version ${version}.
Pre-releases may be unstable. For the latest stable release, re-run with:
  curl -fsSL https://raw.githubusercontent.com/${REPO}/main/install.sh | bash -s -- --version STABLE_VERSION

See https://github.com/${REPO}/releases for available versions.

EOF
      ;;
  esac
}

resolve_release_version() {
  if [[ -n "$requested_version" ]]; then
    RESOLVED_VERSION="${requested_version}"
    RELEASE_BASE_URL="https://github.com/${REPO}/releases/download/btch-dev@${RESOLVED_VERSION}"
    return
  fi

  local tag
  tag=$(curl -fsSL "${RELEASES_API}/latest" \
    | sed -n 's/.*"tag_name":[[:space:]]*"\([^"]*\)".*/\1/p' \
    | head -n 1)
  RESOLVED_VERSION="${tag#btch-dev@}"
  if [[ -z "$RESOLVED_VERSION" ]]; then
    echo "Failed to resolve the latest btch release version." >&2
    exit 1
  fi
  RELEASE_BASE_URL="https://github.com/${REPO}/releases/latest/download"
  warn_if_prerelease "$RESOLVED_VERSION"
}

install_downloaded_release() {
  local tmp_dir binary_file checksum_file
  tmp_dir=$(mktemp -d "${TMPDIR:-/tmp}/btch-install.XXXXXX")
  trap "rm -rf \"$tmp_dir\"" EXIT

  binary_file="${tmp_dir}/${ASSET_NAME}"
  checksum_file="${tmp_dir}/checksums.txt"

  echo "Downloading ${ASSET_NAME}..."
  curl -fSL "${RELEASE_BASE_URL}/${ASSET_NAME}" -o "$binary_file"
  curl -fsSL "${RELEASE_BASE_URL}/checksums.txt" -o "$checksum_file"
  verify_checksum "$binary_file" "$checksum_file"

  cp "$binary_file" "${INSTALL_DIR}/${BINARY_NAME}"
  [[ "$TARGET" != windows-* ]] && chmod 755 "${INSTALL_DIR}/${BINARY_NAME}"
}

install_local_binary() {
  if [[ ! -f "$binary_path" ]]; then
    echo "Binary not found at ${binary_path}" >&2
    exit 1
  fi
  cp "$binary_path" "${INSTALL_DIR}/${BINARY_NAME}"
  [[ "$TARGET" != windows-* ]] && chmod 755 "${INSTALL_DIR}/${BINARY_NAME}"
}

resolve_installed_version() {
  INSTALLED_VERSION=$("${INSTALL_DIR}/${BINARY_NAME}" --version 2>/dev/null | tr -d '\r') || true
  : "${INSTALLED_VERSION:=unknown}"
}

resolve_target

if [[ -n "$binary_path" ]]; then
  install_local_binary
else
  resolve_release_version
  install_downloaded_release
fi

setup_global_symlink
maybe_update_path
resolve_installed_version
write_metadata "$INSTALLED_VERSION"

echo ""
echo "btch ${INSTALLED_VERSION} installed to ${INSTALL_DIR}/${BINARY_NAME}"
echo ""
echo "Run:"
echo "  btch --help"
echo ""

if [[ "$TARGET" != windows-* ]] && ! command -v "${BINARY_NAME}" >/dev/null 2>&1; then
  echo "Note: '${BINARY_NAME}' is not on your current shell's PATH yet."
  echo "Either open a new terminal, or make it available right now with:"
  echo ""
  if [[ -n "$written_config_file" ]]; then
    echo "  source ${written_config_file}"
  else
    echo "  export PATH=${INSTALL_DIR}:\$PATH"
  fi
  echo ""
fi

echo "To uninstall later:"
echo "  btch uninstall"
echo ""
