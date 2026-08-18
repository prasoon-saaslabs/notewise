.PHONY: setup doctor run gateway web website dev desktop stage-gateway qa-gateway build-dmg samples upload-packs upload-packs-dry

ROOT := $(dir $(abspath $(lastword $(MAKEFILE_LIST))))
GW := services/pyai-gateway
SCRIPTS := scripts

setup:
	@echo "==> Python gateway"
	cd $(GW) && python3 -m venv .venv && . .venv/bin/activate && pip install -q -r requirements.txt
	@test -f $(GW)/.env || cp $(GW)/.env.example $(GW)/.env
	@echo "==> Node workspace"
	pnpm install
	@echo ""
	@echo "Setup complete."
	@echo "  Web:     make dev          (gateway + UI, one terminal)"
	@echo "           make run + make web (two terminals)"
	@echo "  Site:    make website      (marketing site, no gateway)"
	@echo "  Desktop: make desktop      (Notewise + local PyAI gateway)"
	@echo "  Check:   make doctor"

doctor:
	@bash $(SCRIPTS)/doctor.sh

run: gateway

gateway:
	@bash $(SCRIPTS)/gateway.sh

web:
	VITE_PROXY_TARGET=http://127.0.0.1:3002 pnpm --filter @notewise/web dev

website:
	pnpm --filter @notewise/website dev

dev:
	@bash $(SCRIPTS)/dev-web.sh

desktop:
	@bash $(SCRIPTS)/dev-desktop.sh

stage-gateway:
	@bash apps/desktop/scripts/stage-pyai-gateway.sh

qa-gateway:
	@bash $(SCRIPTS)/qa-gateway.sh

samples:
	@echo "Import samples from Library → Import 5 sample calls (gateway must be running)."

build-dmg:
	pnpm build:desktop:dmg
	@bash scripts/verify-staged-gateway.sh

upload-packs-dry:
	@cd services/pyai-gateway && . .venv/bin/activate && python ../../scripts/upload-pyai-packs.py --dry-run

upload-packs:
	@cd services/pyai-gateway && . .venv/bin/activate && python ../../scripts/upload-pyai-packs.py --sync-yaml --recap-config
