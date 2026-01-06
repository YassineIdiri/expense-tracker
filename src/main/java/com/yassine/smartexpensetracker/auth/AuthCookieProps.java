package com.yassine.smartexpensetracker.auth;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;

@Component
public class AuthCookieProps {

    @Value("${app.auth.refresh-cookie-name:refresh_token}")
    public String refreshCookieName;

    @Value("${app.auth.refresh-cookie-path:/api/auth/refresh}")
    public String refreshCookiePath;

    @Value("${app.auth.cookie-secure:false}")
    public boolean cookieSecure; // false en dev HTTP, true en prod HTTPS

    @Value("${app.auth.cookie-samesite:Lax}")
    public String sameSite; // Lax / None / Strict
}
