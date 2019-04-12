require "json"

package = JSON.parse(File.read(File.join(__dir__, "package.json")))

Pod::Spec.new do |s|
  s.name         = "RNSpAuth"
  s.version      = package["version"]
  s.summary      = package["description"]
  s.description  = <<-DESC
                  RNSpAuth
                   DESC
  s.homepage     = "https://github.com/sonseait/RNSpAuth"
  s.license      = "MIT"
  # s.license    = { :type => "MIT", :file => "FILE_LICENSE" }
  s.author       = { "author" => "sonseait@gmail.com" }
  s.platform     = :ios, "7.0"
  s.source       = { :git => "https://github.com/sonseait/RNSpAuth.git", :tag => "#{s.version}" }

  s.source_files = "ios/**/*.{h,m}"
  s.requires_arc = true

  s.dependency "React"
  #s.dependency "others"
end