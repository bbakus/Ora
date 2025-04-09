from flask import request, jsonify
from flask_restful import Resource
from server.extensions import api
import os
from openai import OpenAI
from datetime import datetime
import json
from server.models.user import User
from server.extensions import db

# Configure OpenAI API key
openai_api_key = os.environ.get("OPENAI_API_KEY")
if not openai_api_key:
    raise ValueError("OpenAI API key is not set in environment variables")

# Initialize the OpenAI client
client = OpenAI(api_key=openai_api_key)
print(f"OpenAI API key configured: {openai_api_key[:10]}...")  # Log first few chars to verify it's set

class DailyMoodQuestionnaire(Resource):

    def post(self, user_id):
        """Generate six personalized mood questions for the user, using their base aura as a template to gauge"""
        try:
            data = request.get_json()
            current_date = datetime.now().strftime("%A, %B %d")

            print(f"Generating mood questions for user {user_id} on {current_date}")

            # Get the user's aura (if available) to customize questions
            user = db.session.get(User, user_id)
            main_color = user.aura_color if user and user.aura_color else "BLUE"
            
            # Create the prompt for GPT
            prompt = f"""
You are generating a 6-question daily mood check-in for a spiritual location-based app called Ora. The user's current aura is: {main_color}.

Your role is to create questions that quietly interpret someone's present energy and mental landscape without directly mentioning emotions or feelings.

🧠 GOAL:
Help the user express their current vibe through metaphor, sensory choices, and subtle preferences. The questions should reveal mood indirectly, like a poetic personality quiz.

🪄 RULES:
1. You MUST return EXACTLY 6 questions.
2. Each question MUST have exactly 3 multiple choice options.
3. Each option MUST be tagged secretly with one of these colors: RED, ORANGE, YELLOW, GREEN, BLUE, PURPLE, CYAN. THERE IS NO BLACK, NO WHITE, NO PINK, NO BROWN, NO OTHER COLOR THAN WHAT IS ALREADY INDICATED YOU FUCKING PIECE OF SHIT.
4. DO NOT hint at the color name in the answer text.
5. DO NOT reuse the same question structure or sentence starter.
6. DO NOT use words like "emotions", "feelings", or "mood."
7. Prioritize sensory, symbolic, spatial, or narrative language.
8. EVERY QUESTION SHOULD BE UNIQUE EVERY TIME.

🖋 EXAMPLE QUESTION:
- Question: "Which kind of space pulls you in today?"
- "A glowing hallway filled with echoes" → PURPLE
- "A mossy clearing with gentle light" → GREEN
- "A crowded plaza under warm sun" → ORANGE

🎨 Answer choices should align with these color themes:

- RED: high energy, movement, urgency, passion
- ORANGE: warmth, familiarity, comfort, nostalgia
- YELLOW: curiosity, authenticity, traditional, ethnic, openness
- GREEN: groundedness, casual, easy-going, relaxed
- BLUE: calm, distance, thoughtfulness, silence, quiet, space
- PURPLE: elegance, formal, dignified, royal, expensive
- CYAN: novelty, change, modern, unique, refreshing

📦 RESPONSE FORMAT:
Return only valid JSON. Do not include explanations, intros, or markdown. Use this structure:

[
{{
    "question": "Your question text here?",
    "options": [
    {{ "text": "Option 1 text", "color": "COLOR_NAME" }},
    {{ "text": "Option 2 text", "color": "COLOR_NAME" }},
    {{ "text": "Option 3 text", "color": "COLOR_NAME" }}
    ]
}},
{{
    "question": "Second question text?",
    "options": [
    {{ "text": "Option 1 text", "color": "COLOR_NAME" }},
    {{ "text": "Option 2 text", "color": "COLOR_NAME" }},
    {{ "text": "Option 3 text", "color": "COLOR_NAME" }}
    ]
}},
... and 4 more question objects to make exactly 6 questions total
]
"""

            # Call OpenAI API
            response = client.chat.completions.create(
                model="gpt-3.5-turbo",
                messages=[
                    {"role": "system", "content": "You are a helpful assistant that generates thoughtful mood questions with associated color values."},
                    {"role": "user", "content": prompt}
                ],
                temperature=0.7,
                max_tokens=500
            )

            questions_text = response.choices[0].message.content
            print(f"Raw OpenAI response: {questions_text}")

            # Clean up markdown formatting
            if "```json" in questions_text:
                questions_text = questions_text.split("```json")[1].split("```")[0].strip()
            elif "```" in questions_text:
                questions_text = questions_text.split("```")[1].split("```")[0].strip()

            print(f"Cleaned questions: {questions_text}")

            # Try to parse the cleaned text as JSON
            try:
                parsed_questions = json.loads(questions_text)
                
                # Validate the structure and make sure each question has color tags
                valid = True
                
                # Check if we have exactly 6 questions
                if len(parsed_questions) != 6:
                    print(f"Invalid number of questions: {len(parsed_questions)}, expected 6. Falling back.")
                    valid = False
                
                if valid:
                    for question in parsed_questions:
                        if "question" not in question or "options" not in question:
                            valid = False
                            print("Question missing required fields.")
                            break
                        if len(question["options"]) != 3:
                            valid = False
                            print(f"Question has {len(question['options'])} options instead of 3.")
                            break
                        for option in question["options"]:
                            if "text" not in option or "color" not in option:
                                valid = False
                                print("Option missing required fields.")
                                break
                            if option["color"] not in ["RED", "ORANGE", "YELLOW", "GREEN", "BLUE", "PURPLE", "CYAN"]:
                                valid = False
                                print(f"Invalid color: {option['color']}")
                                break
                
                if not valid:
                    print(f"Invalid question format from GPT, falling back.")
                    
                    
            except json.JSONDecodeError as json_err:
                print(f"Invalid JSON from GPT, falling back. Error: {str(json_err)}")
                

            # Return a dictionary, not a Response object
            return {
                "status": "success",
                "questions": parsed_questions,
                "user_id": user_id
            }, 200
        except Exception as e:
            print(f"Error generating mood questions: {str(e)}")
            return {
                "status": "error",
                "message": f"Failed to generate mood questions: {str(e)}",
                "user_id": user_id
            }, 500


class AnalyzeMoodResponse(Resource):
    def post(self, user_id):
        """Analyze user's responses to mood questions and determine aura adjustments"""
        try:
            data = request.get_json()
            questions = data.get('questions', [])
            responses = data.get('responses', [])
            # Get client-determined shape if available (based on response times)
            client_shape = data.get('aura_shape')
            
            print(f"Analyzing mood responses for user {user_id}")
            print(f"Questions: {questions}")
            print(f"Responses: {responses}")
            print(f"Client determined shape: {client_shape}")
            
            if not questions or not responses or len(questions) != len(responses):
                return {
                    "status": "error",
                    "message": "Invalid questions or responses provided",
                    "user_id": user_id
                }, 400
            
            # Extract color values from responses
            color_values = []
            try:
                # Determine how the responses are structured
                for i, response in enumerate(responses):
                    # If responses are just the text values, match them to the options
                    question = questions[i]
                    if isinstance(question, dict) and "options" in question:
                        # Find the selected option
                        matched_option = None
                        for option in question["options"]:
                            if isinstance(option, dict) and "text" in option and option["text"] == response:
                                matched_option = option
                                break
                            
                        # If option found and it has a color, add it
                        if matched_option and "color" in matched_option:
                            color_values.append(matched_option["color"])
                    
                print(f"Extracted color values: {color_values}")
            
                # Count frequency of each color
                color_counts = {}
                for color in color_values:
                    color_counts[color] = color_counts.get(color, 0) + 1
                
                # Sort colors by frequency (highest first)
                sorted_colors = sorted(color_counts.items(), key=lambda x: x[1], reverse=True)
                print(f"Colors sorted by frequency: {sorted_colors}")
                
                # Get the top 3 colors - similar to the original aura questionnaire logic
                top_colors = []
                
                # First add the definite top colors (1st and 2nd)
                for i in range(min(2, len(sorted_colors))):
                    top_colors.append(sorted_colors[i][0])
                
                # Handle the case where we need to decide on the 3rd color
                if len(sorted_colors) > 2:
                    # Get all colors tied for 3rd place
                    third_place_count = sorted_colors[2][1]
                    tied_colors = [entry[0] for entry in sorted_colors[2:] if entry[1] == third_place_count]
                    
                    print(f"Colors tied for 3rd place: {tied_colors} (count: {third_place_count})")
                    
                    # If there's only one, add it
                    if len(tied_colors) == 1:
                        top_colors.append(tied_colors[0])
                    # If there are multiple tied, randomly select one
                    elif len(tied_colors) > 1:
                        import random
                        selected = random.choice(tied_colors)
                        print(f"Randomly selected from tied colors: {selected}")
                        top_colors.append(selected)
                
                # Ensure we have EXACTLY 3 colors
                if len(top_colors) > 3:
                    print(f"Too many colors ({len(top_colors)}), truncating to 3: {top_colors[:3]}")
                    top_colors = top_colors[:3]
                
                # Fill in with defaults if we don't have enough colors
                if len(top_colors) < 3:
                    print(f"Not enough colors ({len(top_colors)}), adding defaults")
                    default_colors = ["BLUE", "PURPLE", "GREEN"]
                    while len(top_colors) < 3:
                        # Find a default color that's not already in top_colors
                        for color in default_colors:
                            if color not in top_colors:
                                print(f"Adding default color: {color}")
                                top_colors.append(color)
                                break
                
                print(f"Final top 3 colors: {top_colors}")
                
                # Map to standard hex colors - always use 6-digit format
                color_mapping = {
                    "RED": "#FF0000",
                    "ORANGE": "#FFA500",
                    "YELLOW": "#FFD700",
                    "GREEN": "#00FF00",
                    "BLUE": "#0000FF",
                    "PURPLE": "#800080",
                    "CYAN": "#00FFFF"
                }
                
                # Map to hex colors - ALWAYS ensure we have exactly 3 colors
                gradient_colors = []
                for color_name in top_colors:
                    hex_color = color_mapping.get(color_name)
                    if hex_color:
                        gradient_colors.append(hex_color)
                    else:
                        # Fallback in case of unknown color
                        print(f"Warning: Unknown color name '{color_name}', using fallback")
                        gradient_colors.append("#0000FF")
                
                # Double-check we have exactly 3 colors
                while len(gradient_colors) < 3:
                    # Add default colors if needed
                    default_hex = ["#0000FF", "#800080", "#00FF00"]
                    for color in default_hex:
                        if color not in gradient_colors:
                            gradient_colors.append(color)
                            break
                
                # Limit to exactly 3 colors
                gradient_colors = gradient_colors[:3]
                
                # Create a CSS gradient with the top 3 colors
                gradient = f"linear-gradient(45deg, {', '.join(gradient_colors)})"
                
                print(f"Generated gradient: {gradient}")
                
                # Determine server aura shape based on frequency of colors
                # (This will be used as fallback if client doesn't provide one)
                shape_mapping = {
                    "RED": "sparkling",
                    "ORANGE": "flowing",
                    "YELLOW": "sparkling",
                    "GREEN": "balanced",
                    "BLUE": "balanced",
                    "PURPLE": "flowing",
                    "CYAN": "pulsing"
                }
                
                # Default to balanced
                server_aura_shape = "balanced"
                
                # If we have any colors, use the shape of the most frequent color
                if top_colors:
                    top_color = top_colors[0]
                    server_aura_shape = shape_mapping.get(top_color, "balanced")
                
                # Use client shape if provided, otherwise use server shape
                aura_shape = client_shape if client_shape else server_aura_shape
                
                # Ensure shape is valid
                valid_shapes = ["sparkling", "flowing", "pulsing", "balanced"]
                if aura_shape not in valid_shapes:
                    aura_shape = "balanced"  # Default to balanced if invalid
                
                print(f"Final aura shape: {aura_shape} (client: {client_shape}, server fallback: {server_aura_shape})")
                
                # Create summary based on dominant colors
                color_meanings = {
                    "RED": "energetic and passionate",
                    "ORANGE": "warm and sociable",
                    "YELLOW": "optimistic and creative",
                    "GREEN": "balanced and natural",
                    "BLUE": "calm and peaceful",
                    "PURPLE": "imaginative and thoughtful",
                    "CYAN": "fresh and innovative"
                }
                
                mood_parts = [color_meanings.get(color, "") for color in top_colors[:2]]
                mood_summary = f"Your mood today is {' with hints of '.join(filter(None, mood_parts))}."
                
                # Create analysis data
                analysis_data = {
                    "aura_color": gradient,
                    "aura_shape": aura_shape,
                    "mood_summary": mood_summary
                }
                
                # Serialize to JSON
                analysis_text = json.dumps(analysis_data)
                
                # Save the aura data to the user's profile
                user = db.session.get(User, user_id)
                if user:
                    user.aura_color = gradient
                    user.aura_shape = aura_shape
                    
                    # Extract individual colors for better frontend use
                    if len(gradient_colors) >= 3:
                        user.aura_color1 = gradient_colors[0]
                        user.aura_color2 = gradient_colors[1]
                        user.aura_color3 = gradient_colors[2]
                    elif len(gradient_colors) == 2:
                        user.aura_color1 = gradient_colors[0]
                        user.aura_color2 = gradient_colors[1]
                        user.aura_color3 = gradient_colors[1]  # Duplicate last color
                    elif len(gradient_colors) == 1:
                        user.aura_color1 = gradient_colors[0]
                        user.aura_color2 = gradient_colors[0]
                        user.aura_color3 = gradient_colors[0]
                        
                    # Save the updated user data
                    db.session.commit()
                    print(f"Saved aura data for user {user_id}: shape={aura_shape}, colors={gradient_colors}")
                else:
                    print(f"Warning: User {user_id} not found, couldn't save aura data")
                
            except Exception as e:
                print(f"Error processing colors: {e}")
                # Fallback
                analysis_text = json.dumps({
                    "aura_color": "linear-gradient(45deg, #054f7d, #00a7cf, #efe348)",
                    "aura_shape": "balanced",
                    "mood_summary": "Your mood today is balanced and thoughtful."
                })
            
            # Return the analysis
            return {
                "status": "success",
                "analysis": analysis_text,
                "user_id": user_id
            }
            
        except Exception as e:
            print(f"Error analyzing mood responses: {str(e)}")
            return {
                "status": "error",
                "message": f"Failed to analyze mood responses: {str(e)}",
                "user_id": user_id
            }, 500

# Register routes
def register_resources(api):
    api.add_resource(DailyMoodQuestionnaire, '/api/users/<user_id>/daily-mood/questions')
    api.add_resource(AnalyzeMoodResponse, '/api/users/<user_id>/daily-mood/analyze') 