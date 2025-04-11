from flask import request, jsonify
from flask_restful import Resource
from server.extensions import api
from server.models.collection import Collection
from server.models.location import Location
from server.extensions import db


class CollectionByID(Resource):
    
    def get(self, user_id, collection_id=None):
        # If collection_id is provided, return that specific collection with its locations
        if collection_id:
            collection = Collection.query.filter_by(id=collection_id, user_id=user_id).first_or_404()
            
            # Get the collection data with locations
            collection_data = collection.to_dict(include_locations=True)
            
            # Enhanced location data with aura colors for frontend display
            if collection_data['locations']:
                # Add the first location's aura to the collection itself
                first_location = collection_data['locations'][0]
                
                # Process all locations
                for i, location in enumerate(collection_data['locations']):
                    # Check if location has aura data in the aura object
                    if 'aura' in location and location['aura']:
                        aura = location['aura']
                        
                        # If aura has a color field that includes a gradient
                        if 'color' in aura and aura['color'] and 'gradient' in aura['color']:
                            # Extract hex colors from gradient
                            import re
                            color_matches = re.findall(r'#[0-9A-Fa-f]{6}|#[0-9A-Fa-f]{3}', aura['color'])
                            if len(color_matches) >= 2:
                                collection_data['locations'][i]['aura_color1'] = color_matches[0]
                                collection_data['locations'][i]['aura_color2'] = color_matches[1]
                                
                                # If this is the first location, also set it on the collection
                                if i == 0:
                                    collection_data['aura_color1'] = color_matches[0]
                                    collection_data['aura_color2'] = color_matches[1]
                                    collection_data['aura_color'] = aura.get('color', '')
                        
                        # Set raw aura color for fallback
                        collection_data['locations'][i]['aura_color'] = aura.get('color', '')
                        
                # If we didn't get aura colors from the first location's aura object, 
                # check if the first location itself has the aura colors set
                if first_location.get('aura_color1') and first_location.get('aura_color2') and not collection_data.get('aura_color1'):
                    collection_data['aura_color1'] = first_location['aura_color1']
                    collection_data['aura_color2'] = first_location['aura_color2']
                
                if first_location.get('aura_color') and not collection_data.get('aura_color'):
                    collection_data['aura_color'] = first_location['aura_color']
            
            return collection_data, 200
        
        # Otherwise return all collections for the user without locations
        collections = Collection.query.filter_by(user_id=user_id).all()
        
        # Add locations to each collection to get the aura
        collections_data = []
        for collection in collections:
            collection_data = collection.to_dict()
            
            # Get the first location to extract its aura
            if collection.locations:
                first_location = collection.locations[0].to_dict()
                
                # Check if location has aura data in the aura object
                if 'aura' in first_location and first_location['aura']:
                    aura = first_location['aura']
                    
                    # If aura has a color field that includes a gradient
                    if 'color' in aura and aura['color'] and 'gradient' in aura['color']:
                        # Extract hex colors from gradient
                        import re
                        color_matches = re.findall(r'#[0-9A-Fa-f]{6}|#[0-9A-Fa-f]{3}', aura['color'])
                        if len(color_matches) >= 2:
                            collection_data['aura_color1'] = color_matches[0]
                            collection_data['aura_color2'] = color_matches[1]
                    
                    # Set raw aura color for fallback
                    collection_data['aura_color'] = aura.get('color', '')
            
            collections_data.append(collection_data)
            
        return collections_data, 200




    def post(self, user_id):
        data = request.get_json()

        if data.get('user_id') != user_id:
            return {
                "error": "User ID mismatch. You can only create collections for yourself."
            }, 401

        collection = Collection(
            name=data['name'],
            user_id=user_id,
            is_base=data.get('is_base', False)
        )

        db.session.add(collection)
        db.session.commit()
        return collection.to_dict(), 201
    




    def patch(self, user_id, collection_id):
        collection = Collection.query.filter_by(id=collection_id, user_id=user_id).first_or_404()
        
        if collection.is_base:
            return {
                "error": "Cannot edit the base collection"
            }, 403

        data = request.get_json()
        if 'name' in data:
            collection.name = data['name']
        
        db.session.commit()
        return collection.to_dict(), 200

    def delete(self, user_id, collection_id):
        collection = Collection.query.filter_by(id=collection_id, user_id=user_id).first_or_404()
        
        # Check if this is a request to remove a specific location
        location_id = request.args.get('location_id')
        if location_id:
            try:
                # Convert to integer
                location_id = int(location_id)
                print(f"Looking for location {location_id}")
                location = Location.query.get_or_404(location_id)
                
                print(f"Collection locations before: {[loc.id for loc in collection.locations]}")
                
                # Check if location is in collection
                location_ids = [loc.id for loc in collection.locations]
                if location_id in location_ids:
                    print(f"Removing location {location_id} from collection {collection_id}")
                    collection.locations.remove(location)
                    db.session.commit()
                    
                    print(f"Collection locations after: {[loc.id for loc in collection.locations]}")
                    
                    # Return the updated collection with locations and aura info
                    collection_data = collection.to_dict(include_locations=True)
                    
                    # Add the first location's aura to the collection if available
                    if collection_data['locations']:
                        first_location = collection_data['locations'][0]
                        
                        # Process all locations
                        for i, location in enumerate(collection_data['locations']):
                            # Check if location has aura data in the aura object
                            if 'aura' in location and location['aura']:
                                aura = location['aura']
                                
                                # If aura has a color field that includes a gradient
                                if 'color' in aura and aura['color'] and 'gradient' in aura['color']:
                                    # Extract hex colors from gradient
                                    import re
                                    color_matches = re.findall(r'#[0-9A-Fa-f]{6}|#[0-9A-Fa-f]{3}', aura['color'])
                                    if len(color_matches) >= 2:
                                        collection_data['locations'][i]['aura_color1'] = color_matches[0]
                                        collection_data['locations'][i]['aura_color2'] = color_matches[1]
                                        
                                        # If this is the first location, also set it on the collection
                                        if i == 0:
                                            collection_data['aura_color1'] = color_matches[0]
                                            collection_data['aura_color2'] = color_matches[1]
                                            collection_data['aura_color'] = aura.get('color', '')
                                
                                # Set raw aura color for fallback
                                collection_data['locations'][i]['aura_color'] = aura.get('color', '')
                        
                        # If we didn't get aura colors from the first location's aura object, 
                        # check if the first location itself has the aura colors set
                        if first_location.get('aura_color1') and first_location.get('aura_color2') and not collection_data.get('aura_color1'):
                            collection_data['aura_color1'] = first_location['aura_color1']
                            collection_data['aura_color2'] = first_location['aura_color2']
                        
                        if first_location.get('aura_color') and not collection_data.get('aura_color'):
                            collection_data['aura_color'] = first_location['aura_color']
                    
                    return collection_data, 200
                else:
                    print(f"Location {location_id} not found in collection {collection_id}")
                    return {"error": f"Location {location_id} not in collection {collection_id}"}, 404
            except ValueError as e:
                print(f"Invalid location_id parameter: {location_id}, error: {str(e)}")
                return {"error": "Invalid location_id parameter"}, 400
            except Exception as e:
                print(f"Unexpected error removing location: {str(e)}")
                return {"error": f"Unexpected error: {str(e)}"}, 500
        
        # If no location_id, delete the entire collection
        if collection.is_base:
            return {
                "error": "Cannot delete the base collection"
            }, 403

        print(f"Deleting entire collection {collection_id}")
        db.session.delete(collection)
        db.session.commit()
        return '', 204

class CollectionAddLocation(Resource):
    """Resource for adding locations to collections"""
    
    def post(self, user_id, collection_id):
        collection = Collection.query.filter_by(id=collection_id, user_id=user_id).first_or_404()
        
        data = request.get_json()
        if 'location_id' not in data:
            return {"error": "Missing location_id in request"}, 400
        
        location = Location.query.get_or_404(data['location_id'])
        
        # Check if location is already in collection
        if location in collection.locations:
            return {"message": "Location already in collection"}, 200
        
        # Add location to collection
        collection.locations.append(location)
        db.session.commit()
        
        # Get the updated collection with locations
        collection_data = collection.to_dict(include_locations=True)
        
        # Add the first location's aura to the collection if available
        if collection_data['locations']:
            first_location = collection_data['locations'][0]
            
            # Process all locations
            for i, location in enumerate(collection_data['locations']):
                # Check if location has aura data in the aura object
                if 'aura' in location and location['aura']:
                    aura = location['aura']
                    
                    # If aura has a color field that includes a gradient
                    if 'color' in aura and aura['color'] and 'gradient' in aura['color']:
                        # Extract hex colors from gradient
                        import re
                        color_matches = re.findall(r'#[0-9A-Fa-f]{6}|#[0-9A-Fa-f]{3}', aura['color'])
                        if len(color_matches) >= 3:
                            collection_data['locations'][i]['aura_color1'] = color_matches[0]
                            collection_data['locations'][i]['aura_color2'] = color_matches[1]
                            collection_data['locations'][i]['aura_color3'] = color_matches[2]
                            
                            # If this is the first location, also set it on the collection
                            if i == 0:
                                collection_data['aura_color1'] = color_matches[0]
                                collection_data['aura_color2'] = color_matches[1]
                                collection_data['aura_color3'] = color_matches[2]
                                collection_data['aura_color'] = aura.get('color', '')
                        elif len(color_matches) >= 2:
                            collection_data['locations'][i]['aura_color1'] = color_matches[0]
                            collection_data['locations'][i]['aura_color2'] = color_matches[1]
                            collection_data['locations'][i]['aura_color3'] = color_matches[1]  # Duplicate the second color as fallback
                            
                            # If this is the first location, also set it on the collection
                            if i == 0:
                                collection_data['aura_color1'] = color_matches[0]
                                collection_data['aura_color2'] = color_matches[1]
                                collection_data['aura_color3'] = color_matches[1]  # Duplicate the second color as fallback
                                collection_data['aura_color'] = aura.get('color', '')
                    
                    # Set raw aura color for fallback
                    collection_data['locations'][i]['aura_color'] = aura.get('color', '')
            
            # If we didn't get aura colors from the first location's aura object, 
            # check if the first location itself has the aura colors set
            if first_location.get('aura_color1') and first_location.get('aura_color2') and not collection_data.get('aura_color1'):
                collection_data['aura_color1'] = first_location['aura_color1']
                collection_data['aura_color2'] = first_location['aura_color2']
                collection_data['aura_color3'] = first_location.get('aura_color3', first_location['aura_color2'])  # Use aura_color3 if available, otherwise fallback to color2
            
            if first_location.get('aura_color') and not collection_data.get('aura_color'):
                collection_data['aura_color'] = first_location['aura_color']
        
        return collection_data, 200

class CollectionRemoveLocation(Resource):
    """Resource for removing locations from collections"""
    
    def post(self, user_id, collection_id):
        collection = Collection.query.filter_by(id=collection_id, user_id=user_id).first_or_404()
        
        data = request.get_json()
        if 'location_id' not in data:
            return {"error": "Missing location_id in request"}, 400
        
        location_id = data['location_id']
        location = Location.query.get_or_404(location_id)
        
        # Check if location is in collection by comparing IDs
        location_ids = [loc.id for loc in collection.locations]
        if location_id not in location_ids:
            return {"error": f"Location {location_id} not in collection {collection_id}"}, 404
        
        # Remove location from collection
        collection.locations.remove(location)
        db.session.commit()
        
        # Return the updated collection with locations
        collection_data = collection.to_dict(include_locations=True)
        
        # Add the first location's aura to the collection if available
        if collection_data['locations']:
            first_location = collection_data['locations'][0]
            
            # Process all locations
            for i, location in enumerate(collection_data['locations']):
                # Check if location has aura data in the aura object
                if 'aura' in location and location['aura']:
                    aura = location['aura']
                    
                    # If aura has a color field that includes a gradient
                    if 'color' in aura and aura['color'] and 'gradient' in aura['color']:
                        # Extract hex colors from gradient
                        import re
                        color_matches = re.findall(r'#[0-9A-Fa-f]{6}|#[0-9A-Fa-f]{3}', aura['color'])
                        if len(color_matches) >= 3:
                            collection_data['locations'][i]['aura_color1'] = color_matches[0]
                            collection_data['locations'][i]['aura_color2'] = color_matches[1]
                            collection_data['locations'][i]['aura_color3'] = color_matches[2]
                            
                            # If this is the first location, also set it on the collection
                            if i == 0:
                                collection_data['aura_color1'] = color_matches[0]
                                collection_data['aura_color2'] = color_matches[1]
                                collection_data['aura_color3'] = color_matches[2]
                                collection_data['aura_color'] = aura.get('color', '')
                        elif len(color_matches) >= 2:
                            collection_data['locations'][i]['aura_color1'] = color_matches[0]
                            collection_data['locations'][i]['aura_color2'] = color_matches[1]
                            collection_data['locations'][i]['aura_color3'] = color_matches[1]  # Duplicate the second color as fallback
                            
                            # If this is the first location, also set it on the collection
                            if i == 0:
                                collection_data['aura_color1'] = color_matches[0]
                                collection_data['aura_color2'] = color_matches[1]
                                collection_data['aura_color3'] = color_matches[1]  # Duplicate the second color as fallback
                                collection_data['aura_color'] = aura.get('color', '')
                    
                    # Set raw aura color for fallback
                    collection_data['locations'][i]['aura_color'] = aura.get('color', '')
            
            # If we didn't get aura colors from the first location's aura object, 
            # check if the first location itself has the aura colors set
            if first_location.get('aura_color1') and first_location.get('aura_color2') and not collection_data.get('aura_color1'):
                collection_data['aura_color1'] = first_location['aura_color1']
                collection_data['aura_color2'] = first_location['aura_color2']
                collection_data['aura_color3'] = first_location.get('aura_color3', first_location['aura_color2'])  # Use aura_color3 if available, otherwise fallback to color2
            
            if first_location.get('aura_color') and not collection_data.get('aura_color'):
                collection_data['aura_color'] = first_location['aura_color']
        
        return collection_data, 200

class SingleCollection(Resource):
    """Resource for fetching a single collection with all its locations"""
    
    def get(self, collection_id):
        collection = Collection.query.get_or_404(collection_id)
        
        # Get the collection data with locations
        collection_data = collection.to_dict(include_locations=True)
        
        # Enhanced location data with aura colors for frontend display
        if collection_data['locations']:
            # Add the first location's aura to the collection itself
            first_location = collection_data['locations'][0]
            
            # Process all locations
            for i, location in enumerate(collection_data['locations']):
                # Check if location has aura data in the aura object
                if 'aura' in location and location['aura']:
                    aura = location['aura']
                    
                    # If aura has a color field that includes a gradient
                    if 'color' in aura and aura['color'] and 'gradient' in aura['color']:
                        # Extract hex colors from gradient
                        import re
                        color_matches = re.findall(r'#[0-9A-Fa-f]{6}|#[0-9A-Fa-f]{3}', aura['color'])
                        if len(color_matches) >= 3:
                            collection_data['locations'][i]['aura_color1'] = color_matches[0]
                            collection_data['locations'][i]['aura_color2'] = color_matches[1]
                            collection_data['locations'][i]['aura_color3'] = color_matches[2]
                            
                            # If this is the first location, also set it on the collection
                            if i == 0:
                                collection_data['aura_color1'] = color_matches[0]
                                collection_data['aura_color2'] = color_matches[1]
                                collection_data['aura_color3'] = color_matches[2]
                                collection_data['aura_color'] = aura.get('color', '')
                        elif len(color_matches) >= 2:
                            collection_data['locations'][i]['aura_color1'] = color_matches[0]
                            collection_data['locations'][i]['aura_color2'] = color_matches[1]
                            collection_data['locations'][i]['aura_color3'] = color_matches[1]  # Duplicate the second color as fallback
                            
                            # If this is the first location, also set it on the collection
                            if i == 0:
                                collection_data['aura_color1'] = color_matches[0]
                                collection_data['aura_color2'] = color_matches[1]
                                collection_data['aura_color3'] = color_matches[1]  # Duplicate the second color as fallback
                                collection_data['aura_color'] = aura.get('color', '')
                    
                    # Set raw aura color for fallback
                    collection_data['locations'][i]['aura_color'] = aura.get('color', '')
            
            # If we didn't get aura colors from the first location's aura object, 
            # check if the first location itself has the aura colors set
            if first_location.get('aura_color1') and first_location.get('aura_color2') and not collection_data.get('aura_color1'):
                collection_data['aura_color1'] = first_location['aura_color1']
                collection_data['aura_color2'] = first_location['aura_color2']
                collection_data['aura_color3'] = first_location.get('aura_color3', first_location['aura_color2'])  # Use aura_color3 if available, otherwise fallback to color2
            
            if first_location.get('aura_color') and not collection_data.get('aura_color'):
                collection_data['aura_color'] = first_location['aura_color']
        
        return collection_data, 200

class CopyCollection(Resource):
    """Resource for copying a collection from one user to another"""
    
    def post(self, user_id):
        try:
            print(f"=============== COPY COLLECTION ===============")
            print(f"Copying collection to user: {user_id}")
            
            # Get the request data
            data = request.get_json()
            print(f"Request data: {data}")
            
            source_user_id = data.get('sourceUserId')
            collection_id = data.get('collectionId')
            
            print(f"Source user: {source_user_id} (type: {type(source_user_id)}), Collection ID: {collection_id} (type: {type(collection_id)})")
            
            if not source_user_id or not collection_id:
                return {"error": "Missing sourceUserId or collectionId"}, 400
            
            # Get the source collection with all locations
            source_collection = Collection.query.filter_by(id=collection_id, user_id=source_user_id).first()
            if not source_collection:
                return {"error": f"Source collection not found (ID: {collection_id}, User: {source_user_id})"}, 404
            
            print(f"Found source collection: {source_collection.name} with {len(source_collection.locations)} locations")
            
            # Create a new collection for the target user
            new_collection = Collection(
                name=source_collection.name,
                user_id=user_id
            )
            db.session.add(new_collection)
            db.session.commit()  # Commit to get the new collection ID
            
            print(f"Created new collection with ID: {new_collection.id}")
            
            # Get all locations from the source collection manually to avoid ORM validation issues
            from sqlalchemy import text
            locations_query = text("""
                SELECT l.* FROM locations l
                JOIN collection_locations cl ON l.id = cl.location_id
                WHERE cl.collection_id = :collection_id
            """)
            
            result = db.session.execute(locations_query, {"collection_id": collection_id})
            source_locations = result.fetchall()
            
            print(f"Found {len(source_locations)} locations to copy")
            
            # Copy all locations to the new collection
            for loc in source_locations:
                print(f"Adding location {loc.name} to new collection")
                
                # First, check if we already have this location in the user's collections
                existing_loc = Location.query.filter_by(
                    name=loc.name,
                    latitude=loc.latitude,
                    longitude=loc.longitude
                ).first()
                
                if existing_loc:
                    print(f"Location {loc.name} already exists, adding to collection")
                    # If the location exists, just add it to the new collection
                    from sqlalchemy import text
                    insert_query = text("""
                        INSERT INTO collection_locations (collection_id, location_id)
                        VALUES (:collection_id, :location_id)
                    """)
                    db.session.execute(insert_query, {
                        "collection_id": new_collection.id,
                        "location_id": existing_loc.id
                    })
                else:
                    print(f"Creating new location {loc.name}")
                    
                    # Print all attributes
                    loc_dict = {}
                    for column in Location.__table__.columns:
                        column_name = column.name
                        if hasattr(loc, column_name):
                            loc_dict[column_name] = getattr(loc, column_name)
                    print(f"Location attributes: {loc_dict}")
                    
                    # Create with specific fields
                    try:
                        # Create a new location with just the required fields
                        new_loc = Location(
                            name=loc.name,
                            latitude=0.0 if loc.latitude is None else float(loc.latitude),
                            longitude=0.0 if loc.longitude is None else float(loc.longitude)
                        )
                        
                        # Add optional fields if they exist
                        if hasattr(loc, 'description') and loc.description:
                            new_loc.description = loc.description
                        
                        if hasattr(loc, 'aura_color') and loc.aura_color:
                            new_loc.aura_color = loc.aura_color
                            
                        if hasattr(loc, 'aura_shape') and loc.aura_shape:
                            new_loc.aura_shape = loc.aura_shape
                        
                        db.session.add(new_loc)
                        db.session.flush()  # Get the new location ID
                        
                        print(f"Created new location with ID: {new_loc.id}")
                        
                        # Link the new location to the collection
                        link_query = text("""
                            INSERT INTO collection_locations (collection_id, location_id)
                            VALUES (:collection_id, :location_id)
                        """)
                        db.session.execute(link_query, {
                            "collection_id": new_collection.id,
                            "location_id": new_loc.id
                        })
                    except Exception as loc_error:
                        print(f"Error creating location: {str(loc_error)}")
                        print(f"Will try raw SQL approach instead")
                        
                        # Fall back to raw SQL approach
                        insert_query = text("""
                            INSERT INTO locations (
                                name, latitude, longitude, aura_color, aura_shape
                            ) VALUES (
                                :name, :latitude, :longitude, :aura_color, :aura_shape
                            ) RETURNING id
                        """)
                        result = db.session.execute(insert_query, {
                            "name": loc.name,
                            "latitude": 0.0 if loc.latitude is None else float(loc.latitude),
                            "longitude": 0.0 if loc.longitude is None else float(loc.longitude),
                            "aura_color": loc.aura_color if hasattr(loc, 'aura_color') else None,
                            "aura_shape": loc.aura_shape if hasattr(loc, 'aura_shape') else None
                        })
                        new_loc_id = result.fetchone()[0]
                        
                        # Link the location to the collection
                        link_query = text("""
                            INSERT INTO collection_locations (collection_id, location_id)
                            VALUES (:collection_id, :location_id)
                        """)
                        db.session.execute(link_query, {
                            "collection_id": new_collection.id,
                            "location_id": new_loc_id
                        })
            
            db.session.commit()
            print(f"Successfully copied collection with all locations")
            
            # Return the new collection data
            collection_data = new_collection.to_dict(include_locations=True)
            print(f"Returning collection data: {collection_data}")
            print(f"=============== COPY COLLECTION COMPLETE ===============")
            return collection_data, 201
            
        except Exception as e:
            db.session.rollback()
            import traceback
            print(f"Error copying collection: {str(e)}")
            print(traceback.format_exc())
            return {"error": str(e)}, 500

# Register routes
def register_resources(api):
    api.add_resource(CollectionByID, '/api/users/<int:user_id>/collections', '/api/users/<int:user_id>/collections/<int:collection_id>')
    api.add_resource(CollectionAddLocation, '/api/users/<int:user_id>/collections/<int:collection_id>/add_location')
    api.add_resource(CollectionRemoveLocation, '/api/users/<int:user_id>/collections/<int:collection_id>/remove_location')
    api.add_resource(SingleCollection, '/api/collections/<int:collection_id>')
    api.add_resource(CopyCollection, '/api/users/<int:user_id>/collections/copy')