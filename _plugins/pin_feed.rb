# Liquid filter for the Pinterest pin feeds (/pins/*.rss):
#   {{ "/assets/pinterest/x.jpg" | file_size }}  -> size in bytes ("0" if the file is missing)
# Needed for <enclosure length="…">. The site is built by GitHub Actions (pages.yml), so _plugins run.
module Nidrassa
  module PinFeedFilters
    def file_size(path)
      site = @context.registers[:site]
      root = File.expand_path(site.source)
      file = File.expand_path(path.to_s.sub(%r{\A/}, ""), root)
      # only files inside the site folder (no ../ outside of it)
      if file.start_with?(root + File::SEPARATOR) && File.file?(file)
        File.size(file).to_s
      else
        Jekyll.logger.warn "Pin-Feed:", "Bild fehlt, Pin wird übersprungen: #{path}"
        "0"
      end
    end
  end
end

Liquid::Template.register_filter(Nidrassa::PinFeedFilters)
