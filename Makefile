.PHONY: help install dev build start test lint format clean docker-up docker-down

help: ## Show this help message
	@echo 'Usage: make [target]'
	@echo ''
	@echo 'Available targets:'
	@grep -E '^[a-zA-Z_-]+:.*?## .*$$' $(MAKEFILE_LIST) | sort | awk 'BEGIN {FS = ":.*?## "}; {printf "  \033[36m%-20s\033[0m %s\n", $$1, $$2}'

install: ## Install dependencies
	npm ci

dev: ## Start development server
	npm run dev

build: ## Build for production
	npm run build

start: ## Start production server
	npm start

test: ## Run tests
	npm test

test-watch: ## Run tests in watch mode
	npm run test:watch

test-coverage: ## Run tests with coverage
	npm run test:coverage

lint: ## Run linter
	npm run lint

lint-fix: ## Fix linting issues
	npm run lint:fix

format: ## Format code with Prettier
	npm run format

clean: ## Clean build artifacts
	npm run clean

docker-up: ## Start Docker containers
	docker-compose up -d

docker-down: ## Stop Docker containers
	docker-compose down

docker-logs: ## View Docker logs
	docker-compose logs -f

docker-rebuild: ## Rebuild and restart Docker containers
	docker-compose down
	docker-compose build --no-cache
	docker-compose up -d
