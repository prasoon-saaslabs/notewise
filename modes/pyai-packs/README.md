# Generated PyAI Trace rule pack payloads (review / diff before upload).

These JSON files are produced by `scripts/upload-pyai-packs.py` from `modes/*.yaml`.
Upload with:

```bash
make upload-packs          # live upload
make upload-packs-dry      # preview
```

Each pack uses `pack_id` prefix `notewise_` (PyAI pattern: `^[a-z0-9_]+$`).

API: [Upload a custom rule pack](https://docs.pyai.com/api-reference/trace/upload-a-custom-rule-pack)

Requires `PYAI_API_KEY` with **`trace:configure`**. Use `--recap-config` to set Recap
`default_pack_id`; use `--trace-config` to enable packs in Trace (warn mode).
