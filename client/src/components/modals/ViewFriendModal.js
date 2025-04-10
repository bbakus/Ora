import React, {useEffect, useState} from "react";
import AuraVisualization from '../AuraVisualization';
import CollectionLocationsModal from "./CollectionLocationsModal";
import { useParams } from "react-router-dom";
import './ViewFriendModal.css';

function ViewFriendModal({friendId, onClose}) {
    const [friendData, setFriendData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [selectedCollection, setSelectedCollection] = useState(null);
    const [showLocationsModal, setShowLocationsModal] = useState(false);
    const { userId } = useParams();

    useEffect(() => {
        const fetchFriendData = async () => {
            try {
                setLoading(true);
                const response = await fetch(`http://localhost:5001/api/users/${friendId}`);
                if (!response.ok) {
                    throw new Error('Failed to fetch friend data');
                }
                const data = await response.json();
                
                // Fetch full collection data for each collection
                const collectionsWithLocations = await Promise.all(
                    data.collections.map(async (collection) => {
                        const collectionResponse = await fetch(`http://localhost:5001/api/users/${friendId}/collections/${collection.id}`);
                        if (!collectionResponse.ok) {
                            console.error(`Failed to fetch collection ${collection.id}`);
                            return collection;
                        }
                        const fullCollectionData = await collectionResponse.json();
                        return fullCollectionData;
                    })
                );
                
                setFriendData({
                    ...data,
                    collections: collectionsWithLocations
                });
            } catch (err) {
                setError(err.message);
            } finally {
                setLoading(false);
            }
        };

        fetchFriendData();
    }, [friendId]);

    const validateShape = (shape) => {
        if (!shape) return 'balanced';
        
        const validShapes = ['soft', 'pulse', 'flowing', 'sparkle', 'balanced', 'pulsing', 'sparkling'];
        const normalizedShape = shape.toLowerCase().trim();
        
        const shapeMap = {
            'soft': 'balanced',
            'flow': 'flowing',
            'pulse': 'pulsing',
            'sparkle': 'sparkling'
        };
        
        return shapeMap[normalizedShape] || (validShapes.includes(normalizedShape) ? normalizedShape : 'balanced');
    };

    const getAuraData = () => {
        if (!friendData) return null;

        // First check if user has direct aura color fields
        if (friendData.aura_color1 && friendData.aura_color2 && friendData.aura_color3) {
            return {
                color1: friendData.aura_color1,
                color2: friendData.aura_color2,
                color3: friendData.aura_color3,
                shape: validateShape(friendData.aura_shape || 'balanced')
            };
        }
        
        // Then check if user has a single aura_color (gradient string)
        if (friendData.aura_color) {
            const colors = friendData.aura_color.match(/#[0-9A-Fa-f]{6}|#[0-9A-Fa-f]{3}/g);
            if (colors && colors.length >= 3) {
                return {
                    color1: colors[0],
                    color2: colors[1],
                    color3: colors[2],
                    shape: validateShape(friendData.aura_shape || 'balanced')
                };
            }
            if (colors && colors.length >= 2) {
                return {
                    color1: colors[0],
                    color2: colors[1],
                    color3: colors[1],
                    shape: validateShape(friendData.aura_shape || 'balanced')
                };
            }
            if (colors && colors.length === 1) {
                return {
                    color1: colors[0],
                    color2: colors[0],
                    color3: colors[0],
                    shape: validateShape(friendData.aura_shape || 'balanced')
                };
            }
        }

        // Default fallback
        return {
            color1: '#0000FF',
            color2: '#800080',
            color3: '#00FFFF',
            shape: 'balanced'
        };
    };

    const handleCopyCollection = async (collectionId) => {
        try {
            const response = await fetch(`http://localhost:5001/api/users/${userId}/collections`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    sourceUserId: friendId,
                    collectionId: collectionId
                })
            });

            if (!response.ok) {
                throw new Error('Failed to copy collection');
            }

            // Refresh friend data to show updated collections
            const updatedResponse = await fetch(`http://localhost:5001/api/users/${friendId}`);
            const updatedData = await updatedResponse.json();
            setFriendData(updatedData);
        } catch (err) {
            setError(err.message);
        }
    };

    const handleAddLocation = async (locationId, targetCollectionId) => {
        try {
            const response = await fetch(`http://localhost:5001/api/users/${userId}/collections/${targetCollectionId}/locations`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    locationId: locationId
                })
            });

            if (!response.ok) {
                throw new Error('Failed to add location to collection');
            }
        } catch (err) {
            setError(err.message);
        }
    };

    if (loading) {
        return (
            <div className="view-friend-modal-container">
                <div className="view-friend-modal-content">
                    <div className="view-friend-modal-loading">Loading...</div>
                </div>
            </div>
        );
    }

    if (error) {
        return (
            <div className="view-friend-modal-container">
                <div className="view-friend-modal-content">
                    <div className="view-friend-modal-error">{error}</div>
                    <button className="view-friend-modal-close-button" onClick={onClose}>×</button>
                </div>
            </div>
        );
    }

    const auraData = getAuraData();

    return (
        <div className="view-friend-modal-container">
            <div className="view-friend-modal-content">
                <button className="view-friend-modal-close-button" onClick={onClose}>×</button>
                
                <div className="view-friend-modal-header">
                    <h2>{friendData.username}</h2>
                    <div className="view-friend-modal-aura-container">
                        {auraData && (
                            <AuraVisualization
                                auraColor={`linear-gradient(45deg, ${auraData.color1}, ${auraData.color2}, ${auraData.color3})`}
                                auraShape={auraData.shape}
                                responseSpeed="medium"
                            />
                        )}
                    </div>
                </div>

                <div className="view-friend-modal-collections">
                    <h3>Collections</h3>
                    {friendData.collections && friendData.collections.length > 0 ? (
                        <div className="view-friend-modal-collections-grid">
                            {friendData.collections.map(collection => {
                                // Determine aura gradient for the collection
                                let auraColor = 'linear-gradient(125deg, #6d4aff, #9e8aff)';
                                if (collection.locations && collection.locations.length > 0) {
                                    const firstLocation = collection.locations[0];
                                    if (firstLocation.aura_color1 && firstLocation.aura_color2) {
                                        auraColor = `linear-gradient(125deg, ${firstLocation.aura_color1}, ${firstLocation.aura_color2})`;
                                    } else if (firstLocation.aura_color) {
                                        if (firstLocation.aura_color.includes('gradient')) {
                                            auraColor = firstLocation.aura_color;
                                        } else {
                                            const colors = firstLocation.aura_color.match(/#[0-9A-Fa-f]{6}|#[0-9A-Fa-f]{3}/g);
                                            if (colors && colors.length >= 2) {
                                                auraColor = `linear-gradient(125deg, ${colors[0]}, ${colors[1]})`;
                                            }
                                        }
                                    }
                                }

                                return (
                                    <div 
                                        key={collection.id} 
                                        className="view-friend-modal-collection-card"
                                        onClick={() => {
                                            setSelectedCollection(collection);
                                            setShowLocationsModal(true);
                                        }}
                                    >
                                        <div className="collection-aura" style={{ background: auraColor }}></div>
                                        <div className="collection-info">
                                            <h4>{collection.name}</h4>
                                            <p>{collection.locations?.length || 0} locations</p>
                                        </div>
                                        <div className="collection-actions">
                                            <button 
                                                className="copy-button"
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    handleCopyCollection(collection.id);
                                                }}
                                            >
                                                <span className="material-icons">content_copy</span>
                                            </button>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    ) : (
                        <p className="no-collections">No collections yet</p>
                    )}
                </div>
            </div>

            {showLocationsModal && selectedCollection && (
                <CollectionLocationsModal
                    collection={selectedCollection}
                    onClose={() => {
                        setShowLocationsModal(false);
                        setSelectedCollection(null);
                    }}
                    onAddLocation={handleAddLocation}
                    isFriendCollection={true}
                />
            )}
        </div>
    );
}

export default ViewFriendModal;

