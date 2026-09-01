import traceback
import json
try:
    import main
    print("[\"SUCCESS\"]")
except Exception as e:
    with open("debug_out.txt", "w") as f:
        f.write(json.dumps(traceback.format_exc().split("\n")))
