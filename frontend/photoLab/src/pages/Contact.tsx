import React, { useState } from "react";
import "./Contact.css";

const Contact: React.FC = () => {
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    message: "",
  });

  const [submitted, setSubmitted] = useState(false);

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>,
  ) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    // basic validation
    if (!formData.name || !formData.email || !formData.message) {
      alert("Please fill all fields");
      return;
    }

    console.log("Form Data:", formData);

    // TODO: integrate backend / email service here

    setSubmitted(true);
    setFormData({ name: "", email: "", message: "" });
  };

  return (
    <div className="contact-container">
      <h1>Contact Us</h1>

      {submitted && (
        <p className="success-message">
          ✅ Your message has been sent successfully!
        </p>
      )}

      <form className="contact-form" onSubmit={handleSubmit}>
        <input
          type="text"
          name="name"
          placeholder="Your Name"
          value={formData.name}
          onChange={handleChange}
        />

        <input
          type="email"
          name="email"
          placeholder="Your Email"
          value={formData.email}
          onChange={handleChange}
        />

        <textarea
          name="message"
          placeholder="Your Message"
          rows={5}
          value={formData.message}
          onChange={handleChange}
        />

        <button type="submit">Send Message</button>
      </form>

      <div className="contact-info">
        <p>📧 Email: your@email.com</p>
        <p>🌐 Website: yourdomain.com</p>
      </div>
    </div>
  );
};

export default Contact;
