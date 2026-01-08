package com.yassine.smartexpensetracker.auth.reset;

public interface EmailSender {
    void send(String to, String subject, String htmlBody);
}
