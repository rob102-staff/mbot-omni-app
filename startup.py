import subprocess

# subprocess.Popen(['gnome-terminal', '-x', "npm", "run", "start-api"])
# subprocess.Popen(['gnome-terminal', '-x', "npm", "run", "dev"])

subprocess.Popen(['rxvt', '-e', "npm", "run", "start-api"])
subprocess.Popen(['rxvt', '-e', "npm", "run", "dev"])