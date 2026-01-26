VERSION := $(shell git describe --tags --always --dirty 2>/dev/null || echo "dev")
LDFLAGS := -ldflags="-s -w -X main.version=$(VERSION)"
BINARY_NAME := fastreader-extract

.PHONY: build build-all test clean install

build:
	go build $(LDFLAGS) -o bin/$(BINARY_NAME) ./cmd/fastreader-extract

build-all:
	GOOS=linux GOARCH=amd64 go build $(LDFLAGS) -o bin/$(BINARY_NAME)-linux-amd64 ./cmd/fastreader-extract
	GOOS=linux GOARCH=arm64 go build $(LDFLAGS) -o bin/$(BINARY_NAME)-linux-arm64 ./cmd/fastreader-extract
	GOOS=darwin GOARCH=amd64 go build $(LDFLAGS) -o bin/$(BINARY_NAME)-darwin-amd64 ./cmd/fastreader-extract
	GOOS=darwin GOARCH=arm64 go build $(LDFLAGS) -o bin/$(BINARY_NAME)-darwin-arm64 ./cmd/fastreader-extract
	GOOS=windows GOARCH=amd64 go build $(LDFLAGS) -o bin/$(BINARY_NAME)-windows-amd64.exe ./cmd/fastreader-extract

test:
	go test -v ./...

clean:
	rm -rf bin/

install: build
	cp bin/$(BINARY_NAME) /usr/local/bin/
