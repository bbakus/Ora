from server.extensions import db
from . import BaseModel
from werkzeug.security import generate_password_hash, check_password_hash
from datetime import datetime

class User(BaseModel):
    __tablename__ = 'users'

    username = db.Column(db.String(80), unique=True, nullable=False)
    email = db.Column(db.String(120), unique=True, nullable=False)
    hashed_password = db.Column(db.String(128))
    aura_color = db.Column(db.String(200))  # Updated to handle gradient strings
    aura_shape = db.Column(db.String(20))  # Shape of their aura
    response_speed = db.Column(db.String(20))  # Speed of response for animations
    
    # Relationships
    reviews = db.relationship('Review', back_populates='user')
    collections = db.relationship('Collection', back_populates='user')

    def set_password(self, password):
        self.hashed_password = generate_password_hash(password)

    def check_password(self, password):
        return check_password_hash(self.hashed_password, password)

    def to_dict(self):
        """Convert user to dictionary for JSON response"""
        try:
            user_dict = {
                'id': self.id,
                'username': self.username,
                'email': self.email,
                'aura_color': self.aura_color or None,
                'aura_shape': self.aura_shape or None,
                'response_speed': self.response_speed or None,
                'created_at': self.created_at.isoformat() if self.created_at else None,
                'updated_at': self.updated_at.isoformat() if self.updated_at else None,
                'reviews': [review.to_dict() for review in self.reviews] if self.reviews else [],
                'collections': [collection.to_dict() for collection in self.collections] if self.collections else []
            }
            # Make sure the ID is included as a string for consistent handling
            user_dict['id_str'] = str(self.id)
            return user_dict
        except Exception as e:
            print(f"Error in to_dict: {str(e)}")
            import traceback
            traceback.print_exc()
            # Return a minimal dictionary with just the essential fields
            return {
                'id': self.id,
                'username': self.username,
                'email': self.email,
                'id_str': str(self.id)
            }

    
