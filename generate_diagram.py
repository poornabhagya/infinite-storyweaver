import os
import urllib.request
from PIL import Image
import matplotlib.pyplot as plt
import matplotlib.patches as patches

os.makedirs("docs", exist_ok=True)
os.makedirs("icons", exist_ok=True)

# Official clean AWS Service SVG/PNG direct URLs
ICONS_URLS = {
    "user": "https://raw.githubusercontent.com/mingrammer/diagrams/master/resources/onprem/client/user.png",
    "client": "https://raw.githubusercontent.com/mingrammer/diagrams/master/resources/onprem/client/client.png",
    "amplify": "https://raw.githubusercontent.com/mingrammer/diagrams/master/resources/aws/mobile/amplify.png",
    "apigw": "https://raw.githubusercontent.com/mingrammer/diagrams/master/resources/aws/network/api-gateway.png",
    "cognito": "https://raw.githubusercontent.com/mingrammer/diagrams/master/resources/aws/security/cognito.png",
    "lambda": "https://raw.githubusercontent.com/mingrammer/diagrams/master/resources/aws/compute/lambda.png",
    "cloudwatch": "https://raw.githubusercontent.com/mingrammer/diagrams/master/resources/aws/management/cloudwatch.png",
    "transcribe": "https://raw.githubusercontent.com/mingrammer/diagrams/master/resources/aws/ml/transcribe.png",
    "polly": "https://raw.githubusercontent.com/mingrammer/diagrams/master/resources/aws/ml/polly.png",
    "dynamodb": "https://raw.githubusercontent.com/mingrammer/diagrams/master/resources/aws/database/dynamodb.png",
    "bedrock": "https://raw.githubusercontent.com/mingrammer/diagrams/master/resources/aws/compute/lambda.png" # Standard AWS GenAI compute
}

# Download missing icons
for name, url in ICONS_URLS.items():
    icon_path = os.path.join("icons", f"{name}.png")
    if not os.path.exists(icon_path):
        try:
            req = urllib.request.Request(url, headers={'User-Agent': 'Mozilla/5.0'})
            with urllib.request.urlopen(req) as resp, open(icon_path, 'wb') as f:
                f.write(resp.read())
        except Exception:
            pass

fig, ax = plt.subplots(figsize=(16, 9), dpi=300)
fig.patch.set_facecolor('#ffffff')
ax.set_facecolor('#ffffff')
ax.set_xlim(0, 16)
ax.set_ylim(0, 9)
ax.axis('off')

# Title
ax.text(8, 8.6, "Infinite StoryWeaver — Production Cloud Architecture", 
        ha='center', va='center', fontsize=18, fontweight='bold', color='#232f3e')
ax.text(8, 8.25, "Event-Driven Serverless Multilingual Story Generation & Speech Pipeline", 
        ha='center', va='center', fontsize=11, color='#545b64')

# Background Layer Cards
def draw_layer_box(x, y, w, h, title, border_col, bg_col):
    box = patches.FancyBboxPatch((x, y), w, h, boxstyle="round,pad=0.1,rounding_size=0.15",
                                 linewidth=1.2, linestyle="--", edgecolor=border_col, facecolor=bg_col, zorder=1)
    ax.add_patch(box)
    ax.text(x + 0.2, y + h - 0.25, title, fontsize=9, fontweight='bold', color=border_col, zorder=2)

draw_layer_box(0.5, 0.6, 2.6, 7.3, "1. Client Layer", "#0073bb", "#f2f8fc")
draw_layer_box(3.5, 0.6, 2.6, 7.3, "2. Edge & Auth", "#8c4fff", "#f9f5ff")
draw_layer_box(6.5, 0.6, 3.2, 7.3, "3. Serverless Core", "#ec7211", "#fffaf5")
draw_layer_box(10.1, 0.6, 5.4, 7.3, "4. AI & Persistence Layer", "#1d8102", "#f7fbf7")

# Render Service Nodes with Image Icons
def draw_node(x, y, icon_key, title, subtitle):
    # Node Background card
    card = patches.FancyBboxPatch((x - 1.1, y - 0.75), 2.2, 1.5, boxstyle="round,pad=0.08,rounding_size=0.1",
                                  linewidth=1, edgecolor="#d5dbdb", facecolor="#ffffff", zorder=3)
    ax.add_patch(card)
    
    # Render Icon
    icon_file = os.path.join("icons", f"{icon_key}.png")
    if os.path.exists(icon_file):
        img = Image.open(icon_file)
        ax.imshow(img, extent=(x - 0.35, x + 0.35, y - 0.1, y + 0.6), zorder=4)
    
    # Text
    ax.text(x, y - 0.3, title, ha='center', va='center', fontsize=9, fontweight='bold', color='#16191f', zorder=5)
    if subtitle:
        ax.text(x, y - 0.52, subtitle, ha='center', va='center', fontsize=7.2, color='#545b64', zorder=5)

# Layer 1
draw_node(1.8, 6.2, "user", "End User", "Microphone / Voice")
draw_node(1.8, 4.0, "client", "React SPA", "Vite Frontend UI")
draw_node(1.8, 1.8, "amplify", "AWS Amplify", "Global App Hosting")

# Layer 2
draw_node(4.8, 5.1, "apigw", "Amazon API Gateway", "POST /api/story")
draw_node(4.8, 2.3, "cognito", "Amazon Cognito", "Auth & ID Tokens")

# Layer 3
draw_node(8.1, 5.1, "lambda", "AWS Lambda", "Story Orchestrator (Node.js)")
draw_node(8.1, 2.3, "cloudwatch", "Amazon CloudWatch", "Audit Logs & Metrics")

# Layer 4
draw_node(12.8, 6.7, "transcribe", "Amazon Transcribe", "Speech-to-Text (STT)")
draw_node(12.8, 4.9, "bedrock", "Amazon Bedrock", "Claude 3.5 Sonnet (Story AI)")
draw_node(12.8, 3.1, "polly", "Amazon Polly", "Neural TTS (Voice Audio)")
draw_node(12.8, 1.3, "dynamodb", "Amazon DynamoDB", "Session Memory & State")

# Clean Straight Connectors
def draw_arrow(x1, y1, x2, y2, label="", color="#545b64", rad=0.0):
    arrow = patches.FancyArrowPatch((x1, y1), (x2, y2),
                                   connectionstyle=f"arc3,rad={rad}",
                                   arrowstyle="Simple,tail_width=1.1,head_width=4.8,head_length=5",
                                   color=color, linewidth=1, zorder=6)
    ax.add_patch(arrow)
    if label:
        mid_x = (x1 + x2) / 2
        mid_y = (y1 + y2) / 2 + 0.12
        ax.text(mid_x, mid_y, label, ha='center', va='center', fontsize=7.2, fontweight='bold',
                color='#232f3e', bbox=dict(boxstyle="round,pad=0.15", fc='#ffffff', ec='#d5dbdb', lw=0.6, alpha=0.95), zorder=7)

# Flows
draw_arrow(1.8, 5.45, 1.8, 4.75, "Voice In", color="#232f3e")
draw_arrow(1.8, 3.25, 1.8, 2.55, "Assets", color="#d13212")
draw_arrow(2.9, 4.0, 3.7, 5.1, "HTTPS POST", color="#8c4fff")
draw_arrow(2.9, 3.8, 3.7, 2.3, "Token", color="#0073bb")

draw_arrow(5.9, 5.1, 7.0, 5.1, "Invoke", color="#ec7211")
draw_arrow(8.1, 4.35, 8.1, 3.05, "Logs", color="#e7157b")

# Lambda to Subsystems
draw_arrow(9.2, 5.4, 11.7, 6.7, "1. Audio Stream", color="#0073bb")
draw_arrow(9.2, 5.2, 11.7, 4.9, "2. Story Prompt", color="#1d8102")
draw_arrow(9.2, 4.9, 11.7, 3.1, "3. Synthesize Speech", color="#8c4fff")
draw_arrow(9.2, 4.7, 11.7, 1.3, "4. Save State", color="#277ac0")

# Audio return flow
ret_arrow = patches.FancyArrowPatch((11.7, 2.9), (2.9, 4.2),
                                   connectionstyle="arc3,rad=0.22",
                                   arrowstyle="Simple,tail_width=1.0,head_width=4.5,head_length=5",
                                   color="#0073bb", linestyle="dashed", linewidth=1.0, zorder=6)
ax.add_patch(ret_arrow)
ax.text(7.2, 6.8, "Return: Synthesized Audio Stream + Next Narrative Chunk", ha='center', va='center', 
        fontsize=8, fontweight='bold', color='#0073bb',
        bbox=dict(boxstyle="round,pad=0.2", fc='#ffffff', ec='#0073bb', lw=0.7, alpha=0.95), zorder=7)

plt.tight_layout()
output_path = os.path.join("docs", "architecture-diagram.png")
plt.savefig(output_path, dpi=300, facecolor='#ffffff', edgecolor='none')
plt.close()
print("Perfect Enterprise Architecture generated at docs/architecture-diagram.png")