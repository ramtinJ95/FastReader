# FastReader Makefile
# Start frontend and backend with configurable ports

# Default ports
FRONTEND_PORT ?= 5173
BACKEND_PORT ?= 8090

# Colors for output
GREEN := \033[0;32m
YELLOW := \033[0;33m
NC := \033[0m # No Color

.PHONY: dev frontend backend stop stop-frontend stop-backend help install

## Start both frontend and backend
dev: backend-bg frontend

## Start frontend dev server
frontend:
	@echo "$(GREEN)Starting frontend on http://localhost:$(FRONTEND_PORT)$(NC)"
	npm run dev -- --port $(FRONTEND_PORT)

## Start backend (PocketBase) in foreground
backend:
	@echo "$(GREEN)Starting backend on http://127.0.0.1:$(BACKEND_PORT)$(NC)"
	@echo "Admin UI: http://127.0.0.1:$(BACKEND_PORT)/_/"
	cd "$(CURDIR)/fastreader-backend" && ./pocketbase serve --http="127.0.0.1:$(BACKEND_PORT)"

## Start backend in background (used by dev target)
backend-bg:
	@if lsof -i:$(BACKEND_PORT) > /dev/null 2>&1; then \
		echo "$(YELLOW)Backend already running on port $(BACKEND_PORT)$(NC)"; \
	else \
		echo "$(GREEN)Starting backend on http://127.0.0.1:$(BACKEND_PORT)$(NC)"; \
		mkdir -p "$(CURDIR)/logs"; \
		cd "$(CURDIR)/fastreader-backend" && ./pocketbase serve --http="127.0.0.1:$(BACKEND_PORT)" > "$(CURDIR)/logs/backend.log" 2>&1 & \
		sleep 1; \
		echo "$(GREEN)Backend started (logs: logs/backend.log)$(NC)"; \
	fi

## Stop all servers
stop: stop-frontend stop-backend
	@echo "$(GREEN)All servers stopped$(NC)"

## Stop frontend server
stop-frontend:
	@-pkill -f "vite.*$(FRONTEND_PORT)" 2>/dev/null || true
	@echo "Frontend stopped"

## Stop backend server
stop-backend:
	@-pkill -f "pocketbase.*$(BACKEND_PORT)" 2>/dev/null || true
	@echo "Backend stopped"

## Install dependencies
install:
	npm install

## Run tests
test:
	npm run test:run

## Run tests in watch mode
test-watch:
	npm run test

## Run E2E tests
test-e2e:
	npm run test:e2e

## Build for production
build:
	npm run build

## Show help
help:
	@echo "FastReader Development Commands"
	@echo ""
	@echo "Usage: make [target] [FRONTEND_PORT=5173] [BACKEND_PORT=8090]"
	@echo ""
	@echo "Targets:"
	@echo "  dev            Start both frontend and backend (default)"
	@echo "  frontend       Start frontend only"
	@echo "  backend        Start backend only (foreground)"
	@echo "  stop           Stop all servers"
	@echo "  stop-frontend  Stop frontend server"
	@echo "  stop-backend   Stop backend server"
	@echo "  install        Install npm dependencies"
	@echo "  test           Run tests once"
	@echo "  test-watch     Run tests in watch mode"
	@echo "  test-e2e       Run E2E tests"
	@echo "  build          Build for production"
	@echo "  help           Show this help"
	@echo ""
	@echo "Examples:"
	@echo "  make dev                          # Start with default ports"
	@echo "  make dev FRONTEND_PORT=3000       # Custom frontend port"
	@echo "  make backend BACKEND_PORT=9000    # Custom backend port"

# Default target
.DEFAULT_GOAL := help
