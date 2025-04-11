from server.extensions import db
from server.models.location_tag import location_tags
from datetime import datetime
from sqlalchemy.orm import validates
import re

class Location(db.Model):
    __tablename__ = 'locations'
    
    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(255), nullable=False)
    google_place_id = db.Column(db.String(255), unique=True, nullable=True)
    latitude = db.Column(db.Float, nullable=False)
    longitude = db.Column(db.Float, nullable=False)
    place_type = db.Column(db.String(100), nullable=True)
    address = db.Column(db.String(255), nullable=True)
    rating = db.Column(db.Float, nullable=True)
    
    # Additional fields
    phone = db.Column(db.String(50), nullable=True)
    website = db.Column(db.String(255), nullable=True)
    price_level = db.Column(db.Integer, nullable=True)
    user_ratings_total = db.Column(db.Integer, nullable=True)
    area = db.Column(db.String(100), nullable=True)
    
    # Direct aura fields for simpler access
    aura_name = db.Column(db.String(100), nullable=True)
    aura_color = db.Column(db.String(255), nullable=True)  # Store gradient CSS
    aura_color1 = db.Column(db.String(7), nullable=True)   # First hex color
    aura_color2 = db.Column(db.String(7), nullable=True)   # Second hex color
    aura_color3 = db.Column(db.String(7), nullable=True)   # Third hex color
    aura_shape = db.Column(db.String(50), nullable=True)   # Shape name: soft, pulse, flowing, sparkle
    
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    # Define the many-to-many relationship with tags (auras)
    tags = db.relationship('Tag', secondary=location_tags, lazy='subquery',
                          back_populates='locations')
    
    # Define the one-to-many relationship with reviews
    reviews = db.relationship('Review', back_populates='location', lazy=True, cascade="all, delete-orphan")
    
    
 
    
 
    
    def __repr__(self):
        return f'<Location {self.name} at {self.latitude},{self.longitude}>'
    
    def to_dict(self):
        """Convert location to dictionary for API responses"""
        location_dict = {
            'id': self.id,
            'name': self.name,
            'google_place_id': self.google_place_id,
            'latitude': self.latitude,
            'longitude': self.longitude,
            'place_type': self.place_type,
            'address': self.address,
            'rating': self.rating,
            'phone': self.phone,
            'website': self.website,
            'price_level': self.price_level,
            'user_ratings_total': self.user_ratings_total,
            'area': self.area,
            'created_at': self.created_at.isoformat() if self.created_at else None,
            'updated_at': self.updated_at.isoformat() if self.updated_at else None
        }
        
        # Add aura information - prioritize direct fields if they exist
        if self.aura_name and (self.aura_color1 or self.aura_color2 or self.aura_color3) and self.aura_shape:
            location_dict['aura'] = {
                'name': self.aura_name,
                'color': self.aura_color or f'linear-gradient(125deg, {self.aura_color1}, {self.aura_color2}, {self.aura_color3})',
                'shape': self.aura_shape
            }
            
            # Set individual color fields
            location_dict['aura_color1'] = self.aura_color1
            location_dict['aura_color2'] = self.aura_color2
            location_dict['aura_color3'] = self.aura_color3
            
            # Always set raw aura_color
            location_dict['aura_color'] = self.aura_color or f'linear-gradient(125deg, {self.aura_color1}, {self.aura_color2}, {self.aura_color3})'
            
        # Fall back to tags relationship if direct fields aren't populated
        elif self.tags:
            # Use the first tag as the aura
            aura_tag = self.tags[0]
            location_dict['aura'] = {
                'name': aura_tag.name,
                'color': aura_tag.color,
                'shape': aura_tag.shape
            }
            
            # Extract aura colors for frontend
            if aura_tag.color and 'gradient' in aura_tag.color:
                # Extract hex colors from gradient string
                color_matches = re.findall(r'#[0-9A-Fa-f]{6}|#[0-9A-Fa-f]{3}', aura_tag.color)
                if len(color_matches) >= 3:
                    location_dict['aura_color1'] = color_matches[0]
                    location_dict['aura_color2'] = color_matches[1]
                    location_dict['aura_color3'] = color_matches[2]
                elif len(color_matches) >= 2:
                    location_dict['aura_color1'] = color_matches[0]
                    location_dict['aura_color2'] = color_matches[1]
                    # Generate a third color that's a blend of the first two
                    location_dict['aura_color3'] = self._blend_colors(color_matches[0], color_matches[1])
                elif len(color_matches) == 1:
                    location_dict['aura_color1'] = color_matches[0]
                    location_dict['aura_color2'] = color_matches[0]
                    location_dict['aura_color3'] = color_matches[0]
            
            # Always set raw aura_color
            location_dict['aura_color'] = aura_tag.color
        
        return location_dict
    
    def _blend_colors(self, color1, color2):
        """Helper method to blend two hex colors"""
        # Remove # if present
        color1 = color1.replace('#', '')
        color2 = color2.replace('#', '')
        
        # Handle both 3-digit and 6-digit formats
        if len(color1) == 3:
            color1 = ''.join([c*2 for c in color1])
        if len(color2) == 3:
            color2 = ''.join([c*2 for c in color2])
        
        # Convert to RGB
        r1, g1, b1 = int(color1[0:2], 16), int(color1[2:4], 16), int(color1[4:6], 16)
        r2, g2, b2 = int(color2[0:2], 16), int(color2[2:4], 16), int(color2[4:6], 16)
        
        # Calculate average
        r = (r1 + r2) // 2
        g = (g1 + g2) // 2
        b = (b1 + b2) // 2
        
        # Convert back to hex
        return f'#{r:02x}{g:02x}{b:02x}'
   