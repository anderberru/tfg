#!/bin/bash

# Move to vagrant's home directory
cd /home/vagrant || exit
mkdir files

# Download Tomcat
echo "Installing Apache Tomcat..."
echo "Copying Struts applications to Tomcat..."
if [ -d "/vagrant/programs" ]; then
    cp /vagrant/programs/* ./
else
    echo "Warning: No applications found in /vagrant/programs"
fi

# Check if the download was successful
if [ ! -f "apache-tomcat-9.0.100.tar.gz" ]; then
    echo "Error: Could not download Tomcat"
    exit 1
fi

# Extract Tomcat
echo "Extracting Apache Tomcat..."
tar -xvzf apache-tomcat-9.0.100.tar.gz

# Check if extraction was successful
if [ ! -d "apache-tomcat-9.0.100" ]; then
    echo "Error: Could not extract Tomcat"
    exit 1
fi

# Move the folder to 'tomcat'
echo "Moving Apache Tomcat to ~/tomcat..."
mv apache-tomcat-9.0.100 tomcat

# Check if the folder was moved
if [ ! -d "tomcat" ]; then
    echo "Error: Could not move Tomcat"
    exit 1
fi

# Copy Struts applications if they exist
echo "Copying Struts applications to Tomcat..."
if [ -d "/vagrant/struts" ]; then
    cp /vagrant/struts/* ~/tomcat/webapps/
else
    echo "Warning: No applications found in /vagrant/struts"
fi

# Start Tomcat
echo "Starting Tomcat..."
cd ~/tomcat/bin || exit
./startup.sh
