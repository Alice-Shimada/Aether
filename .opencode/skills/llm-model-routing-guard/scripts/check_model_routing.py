#!/usr/bin/env python3
import argparse
import re
import subprocess
import sys
from pathlib import Path


LLM_MARKERS = [
    "generateText(",
    "streamText(",
    "Provider.getLanguage(",
    "Provider.defaultModel(",
]


def run(cmd: list[str], cwd: Path) -> str:
    out = subprocess.run(cmd, cwd=str(cwd), capture_output=True, text=True)
    if out.returncode != 0:
        return ""
    return out.stdout


def changed(repo: Path) -> list[str]:
    out = run(["git", "diff", "--name-only"], repo)
    staged = run(["git", "diff", "--name-only", "--cached"], repo)
    rows = set((out + "\n" + staged).splitlines())
    return sorted(x.strip() for x in rows if x.strip())


def text(path: Path) -> str:
    try:
        return path.read_text(encoding="utf-8")
    except Exception:
        return ""


def ext(path: str) -> bool:
    return path.endswith((".ts", ".tsx", ".js", ".mjs", ".cjs"))


def domain(path: str) -> str:
    p = path.replace("\\", "/")
    if "/src/ipk/" in p or "/context/ipk.tsx" in p or "/components/ipk-model-settings-dialog.tsx" in p:
        return "ipk"
    if (
        "/src/adaptation/" in p
        or "/src/task-scope/rerank.ts" in p
        or "/context/adaptation.tsx" in p
        or "/components/adaptation-model-settings-dialog.tsx" in p
    ):
        return "adaptation"
    return "other"


def has_llm_call(src: str) -> bool:
    return any(x in src for x in LLM_MARKERS)


def routed(src: str, grp: str) -> bool:
    if grp == "ipk":
        return "IpkModel.pick(" in src or "IpkLLM." in src or "kind: IpkModelKind" in src
    if grp == "adaptation":
        return "AdaptationModel.pick(" in src or "kind: AdaptationModelKind" in src
    return "Provider.defaultModel(" in src or "Provider.getModel(" in src


def quotes(src: str) -> set[str]:
    return set(re.findall(r'"([a-zA-Z0-9_:-]+)"', src))


def parse_model_enum(src: str, key: str) -> set[str]:
    pat = rf"{re.escape(key)}\s*=\s*z\.enum\(\[(.*?)\]\)"
    m = re.search(pat, src, re.S)
    if not m:
        return set()
    return quotes(m.group(1))


def parse_context_union(src: str, key: str) -> set[str]:
    pat = rf"export type {re.escape(key)}\s*=\s*(.*?)(?:\n\n|$)"
    m = re.search(pat, src, re.S)
    if not m:
        return set()
    return set(re.findall(r'"([a-zA-Z0-9_:-]+)"', m.group(1)))


def parse_dialog_rows(src: str) -> set[str]:
    return set(re.findall(r'kind:\s*"([a-zA-Z0-9_:-]+)"', src))


def check_kind_alignment(repo: Path) -> list[str]:
    out: list[str] = []

    ipk_back = parse_model_enum(text(repo / "packages/opencode/src/ipk/model.ts"), "IpkModelKind")
    ipk_ctx = parse_context_union(text(repo / "packages/app/src/context/ipk.tsx"), "IpkModelKind")
    ipk_ui = parse_dialog_rows(text(repo / "packages/app/src/components/ipk-model-settings-dialog.tsx"))
    if ipk_back and (ipk_back != ipk_ctx or ipk_back != ipk_ui):
        out.append(
            f"IPK model kind mismatch: backend={sorted(ipk_back)}, context={sorted(ipk_ctx)}, ui={sorted(ipk_ui)}"
        )

    ad_back = parse_model_enum(text(repo / "packages/opencode/src/adaptation/model.ts"), "AdaptationModelKind")
    ad_ctx = parse_context_union(text(repo / "packages/app/src/context/adaptation.tsx"), "AdaptationModelKind")
    ad_ui = parse_dialog_rows(text(repo / "packages/app/src/components/adaptation-model-settings-dialog.tsx"))
    if ad_back and (ad_back != ad_ctx or ad_back != ad_ui):
        out.append(
            f"Adaptation model kind mismatch: backend={sorted(ad_back)}, context={sorted(ad_ctx)}, ui={sorted(ad_ui)}"
        )

    return out


def main() -> int:
    parser = argparse.ArgumentParser(description="Check LLM call routing against model-setting registries.")
    parser.add_argument("--repo", required=True, help="Repo root")
    parser.add_argument("--files", nargs="*", help="Optional explicit file list")
    args = parser.parse_args()

    repo = Path(args.repo).resolve()
    files = sorted(set(args.files or changed(repo)))
    unresolved: list[str] = []
    checked: list[str] = []

    for rel in files:
        if not ext(rel):
            continue
        p = repo / rel
        if not p.exists() or not p.is_file():
            continue
        src = text(p)
        if not has_llm_call(src):
            continue
        grp = domain(rel)
        checked.append(f"{rel} [{grp}]")
        if not routed(src, grp):
            unresolved.append(f"{rel}: has LLM call but no obvious {grp} model routing")

    unresolved.extend(check_kind_alignment(repo))

    print("LLM Model Routing Guard")
    print(f"- checked_files: {len(checked)}")
    for row in checked:
        print(f"  - {row}")

    if not unresolved:
        print("- status: ok")
        return 0

    print("- status: unresolved")
    for row in unresolved:
        print(f"  - {row}")
    return 2


if __name__ == "__main__":
    sys.exit(main())
