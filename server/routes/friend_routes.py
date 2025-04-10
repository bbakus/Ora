from flask import jsonify, request
from flask_restful import Resource
from server.extensions import api, db
from server.models.user import User
from server.models.friend_request import FriendRequest  # You'll need to create this model

class UserSearch(Resource):
    def get(self):
        """
        Search for users by username
        Query parameter: query - The search string to match against usernames
        """
        search_query = request.args.get('query', '')
        
        if not search_query:
            return [], 200
        
        # Search for users with usernames that contain the search query
        users = User.query.filter(User.username.ilike(f'%{search_query}%')).limit(20).all()
        
        # Convert to list of dictionaries
        user_list = [
            {
                'id': user.id,
                'username': user.username,
                'aura_color': user.aura_color,
                'aura_shape': user.aura_shape
            }
            for user in users
        ]
        
        return user_list, 200

class FriendRequestResource(Resource):
    def post(self):
        """
        Create a new friend request
        JSON body: sender_id, receiver_id
        """
        print("\n### FRIEND REQUEST POST ENDPOINT CALLED ###")
        print(f"Request headers: {dict(request.headers)}")
        
        # Get request body
        try:
            body = request.get_data()
            print(f"Raw request body: {body}")
            
            # Parse JSON
            data = request.get_json(force=True)
            print(f"Parsed JSON data: {data}")
        except Exception as e:
            print(f"ERROR parsing request data: {str(e)}")
            return {'error': f'Invalid request format: {str(e)}'}, 400
        
        # Extract IDs
        sender_id = data.get('sender_id')
        receiver_id = data.get('receiver_id')
        
        print(f"sender_id: {sender_id} ({type(sender_id).__name__})")
        print(f"receiver_id: {receiver_id} ({type(receiver_id).__name__})")
        
        if not sender_id or not receiver_id:
            print("ERROR: Missing sender_id or receiver_id")
            return {'error': 'Missing sender_id or receiver_id'}, 400
        
        # DIRECT DATABASE OPERATION
        from sqlalchemy import text
        
        try:
            # First check if users exist
            print("Checking if users exist...")
            
            sender_exists = db.session.execute(
                text("SELECT COUNT(*) FROM users WHERE id = :id"),
                {"id": sender_id}
            ).scalar()
            
            if not sender_exists:
                print(f"ERROR: Sender with id={sender_id} not found")
                return {'error': f'Sender with id={sender_id} not found'}, 404
                
            receiver_exists = db.session.execute(
                text("SELECT COUNT(*) FROM users WHERE id = :id"),
                {"id": receiver_id}
            ).scalar()
            
            if not receiver_exists:
                print(f"ERROR: Receiver with id={receiver_id} not found")
                return {'error': f'Receiver with id={receiver_id} not found'}, 404
                
            print("Both users exist")
                
            # Check if already friends
            print("Checking if already friends...")
            friendship_exists = db.session.execute(
                text("""
                    SELECT COUNT(*) FROM friendships 
                    WHERE (user_id = :user_id AND friend_id = :friend_id)
                    OR (user_id = :friend_id AND friend_id = :user_id)
                """),
                {"user_id": sender_id, "friend_id": receiver_id}
            ).scalar()
            
            if friendship_exists:
                print("ERROR: Users are already friends")
                return {'error': 'Users are already friends'}, 400
                
            # Check if request already exists
            print("Checking if request already exists...")
            existing_request = db.session.execute(
                text("""
                    SELECT COUNT(*) FROM friend_requests 
                    WHERE sender_id = :sender_id 
                    AND receiver_id = :receiver_id
                    AND status = 'pending'
                """),
                {"sender_id": sender_id, "receiver_id": receiver_id}
            ).scalar()
            
            if existing_request:
                print("ERROR: Friend request already sent")
                return {'error': 'Friend request already sent'}, 400
                
            # Insert the friend request
            print("Inserting friend request...")
            result = db.session.execute(
                text("""
                    INSERT INTO friend_requests (sender_id, receiver_id, status)
                    VALUES (:sender_id, :receiver_id, 'pending')
                """),
                {"sender_id": sender_id, "receiver_id": receiver_id}
            )
            
            # Get the ID of the inserted request
            request_id = db.session.execute(
                text("SELECT last_insert_rowid()")
            ).scalar()
            
            db.session.commit()
            
            print(f"SUCCESS: Friend request created with ID {request_id}")
            return {'message': 'Friend request sent', 'request_id': request_id}, 201
            
        except Exception as e:
            db.session.rollback()
            print(f"DATABASE ERROR: {str(e)}")
            return {'error': f'Database error: {str(e)}'}, 500
    
    def get(self):
        """
        Get all friend requests for a user
        Query parameter: user_id - The user to get requests for
        Query parameter: type - Either 'sent' or 'received'
        """
        user_id = request.args.get('user_id')
        request_type = request.args.get('type', 'received')  # Default to received
        
        if not user_id:
            return {'error': 'Missing user_id parameter'}, 400
        
        # Get either sent or received requests
        if request_type == 'sent':
            requests = FriendRequest.query.filter_by(
                sender_id=user_id,
                status='pending'
            ).all()
        else:  # 'received'
            requests = FriendRequest.query.filter_by(
                receiver_id=user_id,
                status='pending'
            ).all()
        
        # Convert to list of dictionaries
        request_list = []
        
        for req in requests:
            user = User.query.get(req.receiver_id if request_type == 'sent' else req.sender_id)
            
            if user:
                request_list.append({
                    'id': req.id,
                    'user_id': user.id,
                    'username': user.username,
                    'aura_color': user.aura_color,
                    'aura_shape': user.aura_shape,
                    'created_at': req.created_at.isoformat() if hasattr(req, 'created_at') else None
                })
        
        return request_list, 200
    
    def patch(self, request_id):
        """
        Update a friend request status (accept or reject)
        JSON body: status - Either 'accepted' or 'rejected'
        """
        data = request.get_json()
        
        if not data:
            return {'error': 'No data provided'}, 400
        
        status = data.get('status')
        
        if status not in ['accepted', 'rejected']:
            return {'error': 'Status must be either "accepted" or "rejected"'}, 400
        
        # Find the friend request
        friend_request = FriendRequest.query.get(request_id)
        
        if not friend_request:
            return {'error': 'Friend request not found'}, 404
        
        # Update status
        friend_request.status = status
        
        # If accepted, add the friendship relationship
        if status == 'accepted':
            sender = User.query.get(friend_request.sender_id)
            receiver = User.query.get(friend_request.receiver_id)
            
            if sender and receiver:
                # Add each user to the other's friends list
                # This assumes you have a many-to-many relationship for friendships
                sender.friends.append(receiver)
                receiver.friends.append(sender)
        
        db.session.commit()
        
        return {'message': f'Friend request {status}'}, 200

class UserFriends(Resource):
    def get(self, user_id):
        """Get all friends for a user"""
        try:
            print(f"\n### GETTING FRIENDS FOR USER {user_id} ###")
            user = User.query.get(user_id)
            
            if not user:
                print(f"ERROR: User with id={user_id} not found")
                return {'error': 'User not found'}, 404
            
            # Get all friends with complete aura data
            friends = []
            
            from sqlalchemy import text
            
            # Use a direct SQL query to get friend data with all aura information
            friend_rows = db.session.execute(
                text("""
                    SELECT 
                        u.id, 
                        u.username, 
                        u.aura_color,
                        u.aura_shape,
                        u.response_speed,
                        u.aura_color1,
                        u.aura_color2,
                        u.aura_color3
                    FROM users u
                    JOIN friendships f ON u.id = f.friend_id
                    WHERE f.user_id = :user_id
                """),
                {"user_id": user_id}
            ).fetchall()
            
            print(f"Found {len(friend_rows)} friends for user {user_id}")
            
            # Convert to list of dictionaries with complete data
            for friend in friend_rows:
                friend_data = {
                    'id': friend.id,
                    'username': friend.username,
                    'aura_color': friend.aura_color,
                    'aura_shape': friend.aura_shape,
                    'response_speed': friend.response_speed
                }
                
                # Add individual color components if available
                if friend.aura_color1:
                    friend_data['aura_color1'] = friend.aura_color1
                if friend.aura_color2:
                    friend_data['aura_color2'] = friend.aura_color2
                if friend.aura_color3:
                    friend_data['aura_color3'] = friend.aura_color3
                
                friends.append(friend_data)
            
            print(f"Returning friend data with complete aura information")
            return friends, 200
            
        except Exception as e:
            error_msg = f"Error getting friends: {str(e)}"
            print(f"ERROR: {error_msg}")
            return {'error': error_msg}, 500

# Register the API routes
def initialize_routes(api):
    api.add_resource(UserSearch, '/api/users/search')
    api.add_resource(FriendRequestResource, '/api/friend_requests', '/api/friend_requests/<int:request_id>')
    api.add_resource(UserFriends, '/api/users/<int:user_id>/friends')
    api.add_resource(CheckTablesResource, '/api/check_tables')

# Add this class to check and fix database tables
class CheckTablesResource(Resource):
    def get(self):
        """Check if required tables exist and create them if they don't"""
        from sqlalchemy import text, inspect
        
        try:
            print("\n### CHECKING DATABASE TABLES ###")
            
            # Get list of existing tables
            inspector = inspect(db.engine)
            tables = inspector.get_table_names()
            print(f"Existing tables: {tables}")
            
            result = {
                "tables_checked": [],
                "tables_created": [],
                "errors": []
            }
            
            # Check for friend_requests table
            if 'friend_requests' not in tables:
                print("Creating friend_requests table...")
                try:
                    db.session.execute(text("""
                        CREATE TABLE friend_requests (
                            id INTEGER PRIMARY KEY AUTOINCREMENT,
                            sender_id INTEGER NOT NULL,
                            receiver_id INTEGER NOT NULL,
                            status VARCHAR(20) NOT NULL DEFAULT 'pending',
                            created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
                            updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
                            FOREIGN KEY (sender_id) REFERENCES users (id),
                            FOREIGN KEY (receiver_id) REFERENCES users (id)
                        )
                    """))
                    db.session.commit()
                    result["tables_created"].append("friend_requests")
                except Exception as e:
                    error_msg = f"Failed to create friend_requests table: {str(e)}"
                    print(error_msg)
                    result["errors"].append(error_msg)
            else:
                result["tables_checked"].append("friend_requests")
            
            # Check for friendships table
            if 'friendships' not in tables:
                print("Creating friendships table...")
                try:
                    db.session.execute(text("""
                        CREATE TABLE friendships (
                            user_id INTEGER NOT NULL,
                            friend_id INTEGER NOT NULL,
                            created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
                            PRIMARY KEY (user_id, friend_id),
                            FOREIGN KEY (user_id) REFERENCES users (id),
                            FOREIGN KEY (friend_id) REFERENCES users (id)
                        )
                    """))
                    db.session.commit()
                    result["tables_created"].append("friendships")
                except Exception as e:
                    error_msg = f"Failed to create friendships table: {str(e)}"
                    print(error_msg)
                    result["errors"].append(error_msg)
            else:
                result["tables_checked"].append("friendships")
            
            # Final status
            result["success"] = len(result["errors"]) == 0
            print(f"Database check complete: {result}")
            
            return result, 200
        
        except Exception as e:
            error_msg = f"Error checking database tables: {str(e)}"
            print(error_msg)
            return {"success": False, "error": error_msg}, 500 