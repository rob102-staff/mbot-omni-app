from app import app

if __name__ == '__main__':
    # This script is called when you do `flask run`. In order to listen to
    # LCM, you will need to run a thread (or a scheduler) in the background
    # before calling run.
    app.run(debug=True, port="5000")
