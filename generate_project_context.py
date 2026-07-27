#!/usr/bin/env python3

"""
React + TypeScript Project Structure Generator

Generates:
    project_structure.txt

The output contains a flat list of all project files relative to the project
root using forward slashes.

Folders listed in INCLUDE_FOLDER_ONLY are included, but their contents are not
scanned.

Run:

    python generate_project_context.py
"""

from __future__ import annotations

from fnmatch import fnmatch
from pathlib import Path
from typing import Iterable

OUTPUT_STRUCTURE_FILE = "project_structure.txt"

IGNORED_ITEMS = {
    # Version control
    ".git",

    # Dependencies
    "node_modules",

    # Build output
    "dist",
    "build",
    ".next",
    ".nuxt",
    ".output",
    ".parcel-cache",

    # Coverage
    "coverage",
    ".nyc_output",

    # Cache
    ".cache",
    ".vite",
    ".turbo",

    # Logs
    "*.log",
    "logs",

    # Environment
    ".env",
    ".env.*",

    # Package manager
    "package-lock.json",
    "yarn.lock",
    "pnpm-lock.yaml",
    "bun.lockb",

    # IDE
    ".idea",
    ".vs",
    ".vscode-server",

    # OS
    ".DS_Store",
    "Thumbs.db",
    "desktop.ini",

    # Generated
    OUTPUT_STRUCTURE_FILE,
    Path(__file__).name,
}

INCLUDE_FOLDER_ONLY = {
    ".vscode",
    "docs",
}


def should_ignore(path: Path) -> bool:
    return any(fnmatch(path.name, pattern) for pattern in IGNORED_ITEMS)


def should_include_folder_only(path: Path) -> bool:
    return (
        path.is_dir()
        and any(fnmatch(path.name, pattern) for pattern in INCLUDE_FOLDER_ONLY)
    )


def to_relative(path: Path, root: Path) -> str:
    return path.relative_to(root).as_posix()


def build_structure(root: Path) -> list[str]:
    result: list[str] = []

    def walk(directory: Path) -> None:
        try:
            items = [
                item
                for item in directory.iterdir()
                if not should_ignore(item)
            ]
        except (PermissionError, OSError):
            return

        items.sort(
            key=lambda item: (
                not item.is_dir(),
                item.name.lower(),
            )
        )

        for item in items:
            relative = to_relative(item, root)

            if item.is_symlink():
                result.append(relative + "/" if item.is_dir() else relative)
                continue

            if item.is_dir():
                if should_include_folder_only(item):
                    result.append(relative + "/")
                    continue

                walk(item)
                continue

            if item.is_file():
                result.append(relative)

    walk(root)
    return result


def write_structure(root: Path, paths: Iterable[str]) -> None:
    output = root / OUTPUT_STRUCTURE_FILE
    text = "\n".join(paths)

    if text:
        text += "\n"

    output.write_text(text, encoding="utf-8")


def main() -> None:
    root = Path(__file__).resolve().parent

    structure = build_structure(root)
    write_structure(root, structure)

    print(f"Created: {OUTPUT_STRUCTURE_FILE}")
    print(f"Items listed: {len(structure)}")


if __name__ == "__main__":
    main()