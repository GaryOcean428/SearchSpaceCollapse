def main():
    from qig-backend.shadow_service import shadow_service
    shadow_service.init_state()
    print("Shadow mode initialized (default ON)")
    print("Hello from repl-nix-workspace!")


if __name__ == "__main__":
    main()
