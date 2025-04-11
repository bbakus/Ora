import sys
import os

# Add parent directory to Python path to make 'server' a recognized module
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))

from server.app import create_app

app = create_app()

if __name__ == '__main__':
    # Get port from environment variable or default to 5001
    port = int(os.environ.get('PORT', 5001))
    app.run(host='0.0.0.0', port=port, debug=False) 