#!/bin/bash
set -e

echo "Regenerating reports for W23, W24, W25 for Groww, INDmoney, Zerodha..."

for prod in groww indmoney zerodha; do
  for w in 23 24 25; do
    echo "Running $prod for 2026-W$w..."
    venv/bin/python pulse.py run --product $prod --week 2026-W$w --dry-run
  done
done

echo "Copying updated JSON files to frontend..."
cp -R data/reports/* frontend/public/data/

echo "Done!"
