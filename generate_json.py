import os
import json

models_dir = './models'
glb_files = [f for f in os.listdir(models_dir) if f.endswith('.glb')]

with open('models.json', 'w') as f:
    json.dump(glb_files, f, indent=2)
