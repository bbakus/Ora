from server.extensions import db
from . import BaseModel
from sqlalchemy import ForeignKey
from sqlalchemy.orm import validates

class Collection(BaseModel):
    __tablename__ = 'collections'

    name = db.Column(db.String(100), nullable=False)
    is_base = db.Column(db.Boolean, default=False)  # To mark if it's the base collection
    user_id = db.Column(db.Integer, ForeignKey('users.id'))
    
    # Relationships
    user = db.relationship('User', back_populates='collections')
    locations = db.relationship('Location', secondary='collection_locations')
    
    @validates('name')
    def validate_name(self, key, name):
        if not name:
            raise ValueError('Collection name cannot be empty')
        if len(name) < 2:
            raise ValueError('Collection name must be at least 2 characters')
        if len(name) > 100:
            raise ValueError('Collection name cannot exceed 100 characters')
        return name
    
    @validates('user_id')
    def validate_user_id(self, key, user_id):
        if not user_id:
            raise ValueError('User ID is required for a collection')
        return user_id
    
    @validates('is_base')
    def validate_is_base(self, key, is_base):
        if not isinstance(is_base, bool):
            raise ValueError('is_base must be a boolean value')
        return is_base

    def to_dict(self, include_locations=False):
        collection_dict = {
            'id': self.id,
            'name': self.name,
            'is_base': self.is_base,
            'user_id': self.user_id,
            'created_at': self.created_at.isoformat(),
            'updated_at': self.updated_at.isoformat(),
            'location_count': len(self.locations)
        }
        
        if include_locations:
            collection_dict['locations'] = [location.to_dict() for location in self.locations]
            
        return collection_dict

# This is a junction table to handle the many-to-many relationship between Collections and Locations
collection_locations = db.Table('collection_locations',
    db.Column('collection_id', db.Integer, ForeignKey('collections.id')),
    db.Column('location_id', db.Integer, ForeignKey('locations.id'))
)