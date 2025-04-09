from flask import request, jsonify
from flask_restful import Resource
from server.extensions import api
from server.models.user import User
from server.extensions import db

class UserAura(Resource):
    def post(self, user_id):
        try:
            # Try to convert to integer if possible
            user_id_int = int(user_id)
            user = User.query.get_or_404(user_id_int)
        except ValueError:
            # If not an integer, try to find by string ID
            user = User.query.filter_by(id=user_id).first_or_404()
        
        data = request.get_json()
        
        # Handle both camelCase and snake_case properties
        if 'aura_color' in data:
            user.aura_color = data['aura_color']
        elif 'auraColor' in data:
            user.aura_color = data['auraColor']
            
        if 'aura_shape' in data:
            user.aura_shape = data['aura_shape']
        elif 'auraShape' in data:
            user.aura_shape = data['auraShape']
        
        # Add support for individual color components
        if 'aura_color1' in data:
            user.aura_color1 = data['aura_color1']
        elif 'auraColor1' in data:
            user.aura_color1 = data['auraColor1']
            
        if 'aura_color2' in data:
            user.aura_color2 = data['aura_color2']
        elif 'auraColor2' in data:
            user.aura_color2 = data['auraColor2']
            
        if 'aura_color3' in data:
            user.aura_color3 = data['aura_color3']
        elif 'auraColor3' in data:
            user.aura_color3 = data['auraColor3']
            
        # If we have the aura color but not individual colors, extract them from gradient
        if user.aura_color and (not user.aura_color1 or not user.aura_color2 or not user.aura_color3):
            import re
            # Try to extract hex colors from the gradient string
            colors = re.findall(r'#[0-9A-Fa-f]{6}|#[0-9A-Fa-f]{3}', user.aura_color)
            if colors:
                if len(colors) >= 3:
                    user.aura_color1 = colors[0]
                    user.aura_color2 = colors[1]
                    user.aura_color3 = colors[2]
                elif len(colors) == 2:
                    user.aura_color1 = colors[0]
                    user.aura_color2 = colors[1]
                    user.aura_color3 = colors[1]  # Duplicate last color
                elif len(colors) == 1:
                    user.aura_color1 = colors[0]
                    user.aura_color2 = colors[0]
                    user.aura_color3 = colors[0]
            
        # Store response speed if model has the field
        if hasattr(user, 'response_speed'):
            if 'response_speed' in data:
                user.response_speed = data['response_speed']
            elif 'responseSpeed' in data:
                user.response_speed = data['responseSpeed']
            
        db.session.commit()
        return user.to_dict(), 200

class UserData(Resource):
    def get(self, user_id):
        try:
            # Try to convert to integer if possible
            user_id_int = int(user_id)
            user = User.query.get_or_404(user_id_int)
        except ValueError:
            # If not an integer, try to find by string ID
            user = User.query.filter_by(id=user_id).first_or_404()
            
        return user.to_dict(), 200

# Register routes
def register_resources(api):
    api.add_resource(UserAura, '/api/users/<user_id>/aura')
    api.add_resource(UserData, '/api/users/<user_id>') 