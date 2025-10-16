#!/usr/bin/env bash
# Exit on error
set -e

# Install Rust
curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh -s -- -y

# Add cargo to the path
source "$CARGO_HOME/env"

# Set the default Rust toolchain
rustup default stable

# Run your original build command
pip install -r requirements.txt