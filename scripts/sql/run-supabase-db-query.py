import os
import re
import subprocess
import sys
from pathlib import Path


def main() -> int:
    if len(sys.argv) < 2:
        print("Uso: python3 scripts/sql/run-supabase-db-query.py <arquivo.sql> [args-do-supabase]", file=sys.stderr)
        return 1

    sql_file = Path(sys.argv[1])
    extra_args = sys.argv[2:]

    if not sql_file.is_file():
        print(f"Arquivo SQL nao encontrado: {sql_file}", file=sys.stderr)
        return 1

    env = os.environ.copy()
    db_password = env.get("SUPABASE_DB_PASSWORD", "")

    if not db_password:
        env_file = Path(".env")
        if env_file.is_file():
            match = re.search(r"^#\s*db\s+(.+)$", env_file.read_text(encoding="utf-8"), flags=re.MULTILINE)
            db_password = match.group(1).strip() if match else ""

    if not db_password:
        print(
            "SUPABASE_DB_PASSWORD nao encontrado. Defina a variavel ou mantenha a linha '# db <senha>' no .env local.",
            file=sys.stderr,
        )
        return 1

    env["SUPABASE_DB_PASSWORD"] = db_password

    command = [
        "supabase",
        "db",
        "query",
        "--linked",
        "--output",
        "table",
        "-f",
        str(sql_file),
        *extra_args,
    ]

    return subprocess.run(command, env=env).returncode


if __name__ == "__main__":
    raise SystemExit(main())
