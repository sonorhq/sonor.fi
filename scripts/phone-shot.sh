#!/usr/bin/env bash
# Usage: scripts/phone-shot.sh <input.png> [name]
# Writes site/public/screenshots/phone/<name>.webp: 900 × 1950 sRGB, converted from the iPhone's Display P3.
# Needs ImageMagick 7 (magick) and an sRGB ICC profile; see README for the details.
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

if ! command -v magick >/dev/null 2>&1; then
  echo "ImageMagick 7 is needed (the magick command, with WebP support)" >&2
  exit 1
fi

# The profile the image is converted to. iPhone screenshots are Display P3, and without this transform the
# colours would come out washed out.
srgb_icc=${SRGB_ICC:-}
if [[ -z "$srgb_icc" ]]; then
  for candidate in \
    "/System/Library/ColorSync/Profiles/sRGB Profile.icc" \
    /usr/share/color/icc/colord/sRGB.icc \
    /usr/share/color/icc/sRGB.icc \
    /usr/share/ghostscript/iccprofiles/srgb.icc; do
    if [[ -f "$candidate" ]]; then
      srgb_icc=$candidate
      break
    fi
  done
fi
if [[ -z "$srgb_icc" || ! -f "$srgb_icc" ]]; then
  echo "no sRGB profile found: set SRGB_ICC to an sRGB .icc file" >&2
  exit 1
fi

root=$(cd "$(dirname "$0")/.." && pwd)
out_dir="$root/site/public/screenshots/phone"
out="$out_dir/$name.webp"
width=900
height=1950

read -r src_w src_h < <(magick identify -format '%w %h\n' "$input[0]")
# Warn when the source is not close to 9:19.5, since the crop then removes more than a pixel or two.
if awk -v w="$src_w" -v h="$src_h" 'BEGIN { exit !(h / w < 19.5 / 9 * 0.98 || h / w > 19.5 / 9 * 1.02) }'; then
  echo "warning: ${src_w} × ${src_h} is not 9:19.5; the centre is kept and the rest cropped" >&2
fi

# The profile transform comes before -strip, which then drops the profiles, so the WebP is plain sRGB.
mkdir -p "$out_dir"
magick "$input[0]" -profile "$srgb_icc" -strip -resize "${width}x${height}^" -gravity center \
  -extent "${width}x${height}" -quality 82 "$out"

bytes=$(wc -c <"$out")
echo "wrote $out (${width} × ${height}, $((bytes / 1024)) KB)"
if ((bytes > 400 * 1024)); then
  echo "warning: over 400 KB; the site keeps each shot under about 400 KB" >&2
fi
