import os
import json

# --- Configuration ---
models_dir = './models'
output_json = 'models.json'
base_hue = 0          # start hue (0 = red)
hue_range = 1.0       # hue span (1.0 = full 360°)
saturation = 0.6      # color saturation
lightness = 0.5       # color lightness

# --- Gather .glb files ---
glb_files = sorted(f for f in os.listdir(models_dir) if f.endswith('.glb'))
num_files = len(glb_files)

models_json = []

for i, file_name in enumerate(glb_files):
    # Compute hue based on index
    hue = (base_hue + i / max(1, num_files - 1) * hue_range) % 1.0  # 0..1
    # Convert HSL to hex
    import colorsys
    r, g, b = colorsys.hls_to_rgb(hue, lightness, saturation)
    hex_color = '#{:02x}{:02x}{:02x}'.format(int(r*255), int(g*255), int(b*255))

    models_json.append({
        "file": file_name,
        "displayName": f"Layer {i+1}",
        "color": hex_color
    })

# --- Save JSON ---
with open(output_json, 'w') as f:
    json.dump(models_json, f, indent=2)

print(f"Generated {output_json} with {num_files} layers.")
