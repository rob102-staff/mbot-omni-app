import subprocess

# subprocess.Popen("npm run dev", shell=True)
# subprocess.Popen("npm run start-api", shell=True)

# subprocess.Popen(['gnome-terminal', '-x', "npm run dev"])

subprocess.Popen(['gnome-terminal', '-x', "npm", "run", "start-api"])
subprocess.Popen(['gnome-terminal', '-x', "npm", "run", "dev"])