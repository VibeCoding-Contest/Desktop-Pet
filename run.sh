#!/usr/bin/env bash
# run.sh — 启动桌宠 Electron 应用
# 自动准备 Electron 在 Linux 下依赖的 NSS/NSPR 共享库（无 sudo），然后启动。
set -euo pipefail

# 切到本脚本所在目录（仓库根）
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR"

# ---------- 准备 NSS/NSPR 共享库 ----------
LIBS_ROOT="/tmp/opencode/electron-libs"
LIBS_DIR="$LIBS_ROOT/root/usr/lib/x86_64-linux-gnu"

# 只要任一关键库缺失就重新准备
need_rebuild=0
for lib in libnspr4.so libnss3.so libnssutil3.so libsmime3.so; do
  [ -f "$LIBS_DIR/$lib" ] || { need_rebuild=1; break; }
done

if [ "$need_rebuild" -eq 1 ]; then
  echo "[run.sh] 准备 Electron 依赖的 NSS/NSPR 共享库（仅一次，/tmp 清理后自动重建）..."
  mkdir -p "$LIBS_ROOT"
  cd "$LIBS_ROOT"
  # 下载 .deb（apt-get download 无需 root）
  if ! apt-get download libnss3 libnspr4 >/dev/null 2>&1; then
    echo "[run.sh] 错误：下载 libnss3/libnspr4 失败，请检查网络。" >&2
    exit 1
  fi
  # 解压所有 .deb 到 root/
  for deb in *.deb; do
    dpkg-deb -x "$deb" "$LIBS_ROOT/root" || {
      echo "[run.sh] 错误：解压 $deb 失败。" >&2
      exit 1
    }
  done
  cd "$SCRIPT_DIR"
  echo "[run.sh] 依赖库准备完成。"
fi

export LD_LIBRARY_PATH="$LIBS_DIR:${LD_LIBRARY_PATH:-}"
export DISPLAY="${DISPLAY:-:0}"

# 关闭 GPU/Sandbox 以兼容无显卡/容器环境（与原配置一致）
exec ./node_modules/electron/dist/electron . \
  --disable-gpu \
  --enable-unsafe-swiftshader \
  --use-gl=angle \
  --use-angle=swiftshader \
  --disable-gpu-compositing \
  --disable-gpu-sandbox \
  --no-sandbox
