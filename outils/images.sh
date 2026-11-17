#!/bin/bash
# Prepare les photos : trois largeurs par image, JPEG progressif.
# Source : le dossier des photos d'origine. Sortie : public/img.
set -e
SRC="${1:?usage: outils/images.sh <dossier-source>}"
OUT="$(cd "$(dirname "$0")/.." && pwd)/public/img"
mkdir -p "$OUT"

pose() {  # pose <sous-dossier> <numero> <nom>
  local f="$SRC/$1/$2.jpg" n="$3"
  [ -f "$f" ] || { echo "MANQUE $f"; return; }
  convert "$f" -auto-orient -resize '1800x>' -quality 82 -interlace Plane -strip "$OUT/$n.jpg"
  convert "$f" -auto-orient -resize '1100x>' -quality 82 -interlace Plane -strip "$OUT/$n-1100.jpg"
  convert "$f" -auto-orient -resize  '640x>' -quality 80 -interlace Plane -strip "$OUT/$n-640.jpg"
  echo "$n"
}

pose chambre-1 30 junior-1;  pose chambre-1 31 junior-2
pose chambre-1 32 junior-3;  pose chambre-1 33 junior-4

pose chambre-2 34 triple-1;  pose chambre-2 35 triple-2;  pose chambre-2 36 triple-3
pose chambre-2 37 triple-4;  pose chambre-2 38 triple-5

pose family 39 family-1;  pose family 40 family-2
pose family 41 family-3;  pose family 42 family-4

pose king-pool-view 43 poolview-1;  pose king-pool-view 44 poolview-2
pose king-pool-view 45 poolview-3;  pose king-pool-view 46 poolview-4

pose king-private-salah 47 salah-1;  pose king-private-salah 48 salah-2
pose king-private-salah 49 salah-3;  pose king-private-salah 50 salah-4

pose presidentielle 51 presidential-1;  pose presidentielle 52 presidential-2
pose presidentielle 53 presidential-3;  pose presidentielle 54 presidential-4
pose presidentielle 55 presidential-5

pose propriete 56 pool-loungers;  pose propriete 57 deck-salah;  pose propriete 58 pool-wide
pose propriete 59 warrior-gong;   pose propriete 60 elephant-red

echo "---"
ls "$OUT" | wc -l

# Releve les largeurs reelles pour que les srcset ne mentent pas.
node -e '
const { execSync } = require("node:child_process");
const { readdirSync, writeFileSync } = require("node:fs");
const d = process.argv[1];
const m = {};
for (const f of readdirSync(d).filter(f => f.endsWith(".jpg"))) {
  const [w, h] = execSync(`identify -format "%w %h" ${JSON.stringify(d + "/" + f)}`)
    .toString().trim().split(" ").map(Number);
  m[f.replace(/\.jpg$/, "")] = [w, h];
}
writeFileSync(process.argv[2], JSON.stringify(m, null, 0) + "\n");
console.log(Object.keys(m).length + " entrees dans images.json");
' "$OUT" "$(cd "$(dirname "$0")/.." && pwd)/data/images.json"
