from server.extensions import db
from . import BaseModel
from werkzeug.security import generate_password_hash, check_password_hash
from datetime import datetime
from sqlalchemy.orm import validates
import re

# Define the friendship association table
friendships = db.Table('friendships',
    db.Column('user_id', db.Integer, db.ForeignKey('users.id'), primary_key=True),
    db.Column('friend_id', db.Integer, db.ForeignKey('users.id'), primary_key=True),
    db.Column('created_at', db.DateTime, default=datetime.utcnow)
)

class User(BaseModel):
    __tablename__ = 'users'

    username = db.Column(db.String(80), unique=True, nullable=False)
    email = db.Column(db.String(120), unique=True, nullable=False)
    hashed_password = db.Column(db.String(512))
    aura_color = db.Column(db.String(200))  # Updated to handle gradient strings
    aura_shape = db.Column(db.String(20))  # Shape of their aura
    response_speed = db.Column(db.String(20))  # Speed of response for animations
    
    # Individual aura color components for easier frontend use
    aura_color1 = db.Column(db.String(20))  # First color in gradient
    aura_color2 = db.Column(db.String(20))  # Second color in gradient
    aura_color3 = db.Column(db.String(20))  # Third color in gradient
    
    # Relationships
    reviews = db.relationship('Review', back_populates='user')
    collections = db.relationship('Collection', back_populates='user')
    
    # Friendship relationship (self-referential many-to-many)
    friends = db.relationship(
        'User', 
        secondary=friendships,
        primaryjoin="User.id==friendships.c.user_id",
        secondaryjoin="User.id==friendships.c.friend_id",
        backref=db.backref('befriended_by', lazy='dynamic'),
        lazy='dynamic'
    )

  
    
    def set_password(self, password):
        self.hashed_password = generate_password_hash(password)

    def check_password(self, password):
        return check_password_hash(self.hashed_password, password)
    
    def add_friend(self, user):
        """Add a user to friends list"""
        if user not in self.friends:
            self.friends.append(user)
            # Ensure the relationship is bidirectional
            if self not in user.friends:
                user.friends.append(self)
            return True
        return False
    
    def remove_friend(self, user):
        """Remove a user from friends list"""
        if user in self.friends:
            self.friends.remove(user)
            # Ensure the relationship is bidirectional
            if self in user.friends:
                user.friends.remove(self)
            return True
        return False

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
                'aura_color1': self.aura_color1 or None,
                'aura_color2': self.aura_color2 or None,
                'aura_color3': self.aura_color3 or None,
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

    
