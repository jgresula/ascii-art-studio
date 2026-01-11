# Makefile for building ASCII converter WASM module

WASM_SRC_DIR = wasm-src
WASM_TARGET = wasm32-unknown-unknown
WASM_OUTPUT = ascii-wasm.wasm

.PHONY: all clean wasm

all: wasm

# Build optimized WASM module
wasm:
	cd $(WASM_SRC_DIR) && cargo build --release --target $(WASM_TARGET)
	cp $(WASM_SRC_DIR)/target/$(WASM_TARGET)/release/ascii_wasm.wasm $(WASM_OUTPUT)
	@echo "Built $(WASM_OUTPUT)"
	@ls -lh $(WASM_OUTPUT)

# Optional: strip debug info for smaller size (requires wasm-strip from wabt)
strip: wasm
	wasm-strip $(WASM_OUTPUT) 2>/dev/null || echo "wasm-strip not found, skipping"

# Clean build artifacts
clean:
	cd $(WASM_SRC_DIR) && cargo clean
	rm -f $(WASM_OUTPUT)

# Install required toolchain
setup:
	rustup target add $(WASM_TARGET)
