from server.extensions import db
from . import BaseModel
from sqlalchemy import ForeignKey

class Collection(BaseModel):
    __tablename__ = 'collections'

    name = db.Column(db.String(100), nullable=False)
    is_base = db.Column(db.Boolean, default=False)  # To mark if it's the base collection
    user_id = db.Column(db.Integer, ForeignKey('users.id'))
    
    # Relationships
    user = db.relationship('User', back_populates='collections')
    locations = db.relationship('Location', secondary='collection_locations')

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