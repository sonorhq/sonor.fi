#!/usr/bin/env bash
# Turns an iPhone screenshot (PNG, 1179 × 2556 or any 9:19.5 size) into the 900 × 1950 WebP that the site shows
# beside a desktop shot: site/public/screenshots/phone/<name>.webp.
#
# Usage: scripts/phone-shot.sh <input.png> [name]
#   name defaults to the input's file name without its extension.
#
# Needs ImageMagick 7 (magick) with WebP support, or ImageMagick 6 (convert). The image is scaled to cover
# 900 × 1950 and the overflow (a pixel or two for a 9:19.5 phone) is cropped from the centre.
set -euo pipefail

if [[ $# -lt 1 || $# -gt 2 ]]; then
  echo "usage: $0 <input.png> [name]" >&2
  exit 2
fi

input=$1
name=${2:-$(basename "${input%.*}")}
if [[ ! "$name" =~ ^[A-Za-z0-9][A-Za-z0-9._-]*$ ]]; then
  echo "name must be a plain file name (letters, digits, dots, dashes): $name" >&2
  exit 2
fi
if [[ ! -f "$input" ]]; then
  echo "no such file: $input" >&2
  exit 1
fi

if command -v magick >/dev/null 2>&1; then
  im=(magick)
elif command -v convert >/dev/null 2>&1; then
  im=(convert)
else
  echo "ImageMagick is needed (magick or convert, with WebP support)" >&2
  exit 1
fi

root=$(cd "$(dirname "$0")/.." && pwd)
out_dir="$root/site/public/screenshots/phone"
out="$out_dir/$name.webp"
width=900
height=1950

read -r src_w src_h < <("${im[@]}" identify -format '%w %h\n' "$input[0]")
# Warn when the source is not close to 9:19.5, since the crop then removes more than a pixel or two.
if awk -v w="$src_w" -v h="$src_h" 'BEGIN { exit !(h / w < 19.5 / 9 * 0.98 || h / w > 19.5 / 9 * 1.02) }'; then
  echo "warning: ${src_w} × ${src_h} is not 9:19.5; the centre is kept and the rest cropped" >&2
fi

mkdir -p "$out_dir"
"${im[@]}" "$input[0]" -strip -resize "${width}x${height}^" -gravity center -extent "${width}x${height}" \
  -quality 82 "$out"

bytes=$(wc -c <"$out")
echo "wrote $out (${width} × ${height}, $((bytes / 1024)) KB)"
if ((bytes > 400 * 1024)); then
  echo "warning: over 400 KB; the site keeps each shot under about 400 KB" >&2
fi
