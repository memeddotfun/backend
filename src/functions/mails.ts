const mails = {
    waitlist: (name:string, token:string) => {
      return {
              subject: `Verify to Secure Your Spot`,
              text: `Welcome to the Future - Memed.fun

Hey ${name}! 👋

You're on the exclusive waitlist!
Where memes meet blockchain innovation

Ready to fuel viral battles and win the internet? Verify your email to secure early access.

Verify your email by visiting: ${process.env.FRONTEND_URL}/verify?token=${token}

Features:
- Viral Battles 🔥
- Win Rewards 🏆
- On-Chain ⛓️

© 2025 Memed 🚀
Didn't sign up? You can safely ignore this email.
`,
              html: `
        <!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Welcome to Memed.fun</title>
    <style>
        * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
        }
        
        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            background: linear-gradient(135deg, #f9fafb 0%, #f3f4f6 100%);
            min-height: 100vh;
            padding: 48px 16px;
        }
        
        .container {
            max-width: 512px;
            margin: 0 auto;
        }
        
        .card {
            background: rgba(255, 255, 255, 0.9);
            border-radius: 24px;
            box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.25);
            overflow: hidden;
            backdrop-filter: blur(8px);
        }
        
        .header {
            background: linear-gradient(90deg, #28d358 0%, #28d358 50%, #46ef76 100%);
            padding: 32px;
            text-align: center;
            position: relative;
        }
        
        .header::before {
            content: '';
            position: absolute;
            top: 0;
            left: 0;
            right: 0;
            bottom: 0;
            background: linear-gradient(90deg, rgba(52, 211, 153, 0.2) 0%, rgba(16, 185, 129, 0.2) 50%, rgba(20, 184, 166, 0.2) 100%);
            animation: pulse 2s infinite;
        }
        
        @keyframes pulse {
            0%, 100% { opacity: 0.2; }
            50% { opacity: 0.4; }
        }
        
        .header-content {
            position: relative;
            z-index: 10;
        }
        
        .rocket {
            font-size: 48px;
            margin-bottom: 12px;
            display: block;
        }
        
        .header h1 {
            color: white;
            font-size: 24px;
            font-weight: bold;
            margin-bottom: 8px;
        }
        
        .header p {
            color: #bbf7d0;
            font-size: 14px;
            font-weight: 500;
        }
        
        .content {
            padding: 32px;
        }
        
        .greeting {
            text-align: center;
            margin-bottom: 24px;
        }
        
        .greeting h2 {
            font-size: 24px;
            font-weight: bold;
            color: #1f2937;
            margin-bottom: 8px;
        }
        
        .divider {
            width: 64px;
            height: 4px;
            background: linear-gradient(90deg, #4ade80, #10b981);
            margin: 0 auto;
            border-radius: 2px;
        }
        
        .status-card {
            background: linear-gradient(90deg, #f0fdf4, #ecfdf5);
            border: 2px solid #bbf7d0;
            border-radius: 16px;
            padding: 24px;
            text-align: center;
            margin-bottom: 24px;
        }
        
        .status-icon {
            font-size: 36px;
            margin-bottom: 12px;
            display: block;
        }
        
        .status-card h3 {
            color: #374151;
            font-weight: 600;
            margin-bottom: 8px;
        }
        
        .status-card p {
            color: #6b7280;
            font-size: 14px;
        }
        
        .action-section {
            margin-bottom: 24px;
        }
        
        .description {
            color: #6b7280;
            text-align: center;
            line-height: 1.6;
            margin-bottom: 24px;
        }
        
        .highlight {
            color: #059669;
            font-weight: 600;
        }
        
        .button-container {
            text-align: center;
            margin-bottom: 24px;
        }
        
        .verify-button {
            display: inline-flex;
            align-items: center;
            gap: 8px;
            background: linear-gradient(90deg, #28d358, #49f379);
            color: white;
            padding: 16px 32px;
            font-size: 18px;
            font-weight: 600;
            border-radius: 16px;
            text-decoration: none;
            box-shadow: 0 10px 25px -5px rgba(0, 0, 0, 0.1);
            transition: all 0.3s ease;
        }
        
        .verify-button:hover {
            background: linear-gradient(90deg, #28d358, #49f379);
            transform: scale(1.05);
            box-shadow: 0 20px 40px -10px rgba(0, 0, 0, 0.2);
        }
        
        .alt-link {
            background: #f9fafb;
            border-radius: 16px;
            padding: 16px;
            margin-bottom: 24px;
        }
        
        .alt-link-label {
            font-size: 12px;
            color: #6b7280;
            font-weight: 500;
            text-transform: uppercase;
            letter-spacing: 0.05em;
            margin-bottom: 8px;
        }
        
        .alt-link-box {
            background: white;
            border: 1px solid #e5e7eb;
            border-radius: 8px;
            padding: 12px;
        }
        
        .alt-link a {
            color: #059669;
            font-size: 14px;
            font-family: 'Courier New', monospace;
            word-break: break-all;
            text-decoration: none;
        }
        
        .alt-link a:hover {
            color: #047857;
        }
        
        .features {
            display: grid;
            grid-template-columns: repeat(3, 1fr);
            gap: 16px;
            padding-top: 16px;
        }
        
        .feature {
            text-align: center;
        }
        
        .feature-icon {
            font-size: 24px;
            margin-bottom: 8px;
            display: block;
        }
        
        .feature-text {
            font-size: 12px;
            color: #6b7280;
            font-weight: 500;
        }
        
        .footer {
            text-align: center;
            margin-top: 32px;
        }
        
        .footer p {
            color: #6b7280;
            font-size: 14px;
            margin-bottom: 8px;
        }
        
        .footer .small {
            font-size: 12px;
            color: #9ca3af;
        }
        
        @media (max-width: 640px) {
            body {
                padding: 24px 8px;
            }
            
            .content {
                padding: 24px;
            }
            
            .header {
                padding: 24px;
            }
            
            .verify-button {
                padding: 14px 24px;
                font-size: 16px;
            }
        }
    </style>
</head>
<body>
    <div class="container">
        <!-- Main Card -->
        <div class="card">
            <!-- Header -->
            <div class="header">
                <div class="header-content">
                    <span class="rocket">🚀</span>
                    <h1>Welcome to the Future</h1>
                    <p>Memed.fun</p>
                </div>
            </div>

            <!-- Content -->
            <div class="content">
                <!-- Greeting -->
                <div class="greeting">
                    <h2>Hey ${name}! 👋</h2>
                    <div class="divider"></div>
                </div>

                <!-- Status Card -->
                <div class="status-card">
                    <span class="status-icon">🎯</span>
                    <h3>You're on the exclusive waitlist!</h3>
                    <p>Where memes meet blockchain innovation</p>
                </div>

                <!-- Action Section -->
                <div class="action-section">
                    <p class="description">
                        Ready to <span class="highlight">fuel viral battles</span> and 
                        <span class="highlight">win the internet</span>? Verify your email to secure early access.
                    </p>

                    <!-- Verify Button -->
                    <div class="button-container">
                        <a href="${process.env.FRONTEND_URL}/verify?token=${token}" class="verify-button">
                            <span>✨</span>
                            Verify My Email
                            <span>→</span>
                        </a>
                    </div>
                </div>

                <!-- Alternative Link -->
                <div class="alt-link">
                    <div class="alt-link-label">Alternative Link</div>
                    <div class="alt-link-box">
                        <a href="${process.env.FRONTEND_URL}/verify?token=${token}">
                            ${process.env.FRONTEND_URL}/verify?token=${token}
                        </a>
                    </div>
                </div>

                <!-- Features Preview -->
                <div class="features">
                    <div class="feature">
                        <span class="feature-icon">🔥</span>
                        <p class="feature-text">Viral Battles</p>
                    </div>
                    <div class="feature">
                        <span class="feature-icon">🏆</span>
                        <p class="feature-text">Win Rewards</p>
                    </div>
                    <div class="feature">
                        <span class="feature-icon">⛓️</span>
                        <p class="feature-text">On-Chain</p>
                    </div>
                </div>
            </div>
        </div>

        <!-- Footer -->
        <div class="footer">
            <p>© 2025 Memed 🚀</p>
            <p class="small">Didn't sign up? You can safely ignore this email.</p>
        </div>
    </div>
</body>
</html>
              `,
            }
          }
      }

export default mails;